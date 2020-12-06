const { parse, print, Kind, buildSchema } = require('graphql');

// Federation services are actually fairly complex,
// as the `buildFederatedSchema` helper does a fair amount
// of hidden work to setup the Federation schema specification:
// https://www.apollographql.com/docs/federation/federation-spec/#federation-schema-specification
module.exports = async function makeFederationSubchema(executor) {
  // The federation spec includes a query used to fetch a service's raw SDL, so use it...
  const result = await executor({ document: '{ _service { sdl } }' });
  const doc = parse(result.data._service.sdl);
  const subschemaConfig = {};

  doc.definitions.forEach(typeDef => {
    // Un-extend all types (remove "extends" keywords)...
    // extended types are invalid GraphQL without a local base type to extend from.
    // Stitching merges flat types in lieu of hierarchical extensions.
    typeDef.kind = typeDef.kind.replace(/Extension$/, 'Definition');
    if (typeDef.kind !== Kind.OBJECT_TYPE_DEFINITION) return;

    // Find object definitions with "@key" directives;
    // these are federated entities that get turned into merged types.
    const keyDirs = typeDef.directives.filter(dir => dir.name.value === 'key');
    if (!keyDirs.length) return;

    // Setup stitching MergedTypeConfig for all federated entities:
    const typeName = typeDef.name.value;
    const selectionSet = `{ ${ keyDirs.map(dir => dir.arguments[0].value.value).join(' ') } }`;
    const keyFields = parseSelectionSetKeys(selectionSet);
    const mergedTypeConfig = {
      selectionSet,
      fieldName: '_entities',
      key: (obj) => ({ __typename: typeName, ...pick(obj, keyFields) }),
      argsFromKeys: (representations) => ({ representations }),
    };

    subschemaConfig.merge = subschemaConfig.merge || {};
    subschemaConfig.merge[typeName] = mergedTypeConfig;

    // Remove non-key "@external" fields from the type...
    // the stitching query planner expects services to only publish their own fields.
    // This makes "@provides" moot because the query planner can automate the logic.
    typeDef.fields = typeDef.fields.filter(fieldDef => {
      const external = fieldDef.directives.find(dir => dir.name.value === 'external');
      return !external || keyFields.includes(fieldDef.name.value);
    });

    // Build computed references for "@requires" fields...
    // these translate roughly 1:1 between stitching and federation.
    typeDef.fields.forEach(fieldDef => {
      const requires = fieldDef.directives.find(dir => dir.name.value === 'requires');
      if (requires) {
        const selectionSet = `{ ${requires.arguments[0].value.value} }`;
        parseSelectionSetKeys(selectionSet).forEach(key => keyFields.push(key));

        mergedTypeConfig.computedFields = mergedTypeConfig.computedFields || {};
        mergedTypeConfig.computedFields[fieldDef.name.value] = { selectionSet };
      }
    });
  });

  // Federation service SDLs are incomplete because they omit the federation spec itself...
  // (https://www.apollographql.com/docs/federation/federation-spec/#federation-schema-specification)
  // To make federation SDLs into valid and parsable GraphQL schemas,
  // we must fill in the missing details from the specification.
  let typeDefs = `
    scalar _Any
    scalar _FieldSet
    directive @external on FIELD_DEFINITION
    directive @requires(fields: _FieldSet!) on FIELD_DEFINITION
    directive @provides(fields: _FieldSet!) on FIELD_DEFINITION
    directive @key(fields: _FieldSet!) on OBJECT | INTERFACE
    ${print(doc)}
  `;

  // When federated entities are present (types with "@key" turned into MergedTypeConfig),
  // then the "_entities" service must be included with the corresponding "_Entity" abstract.
  if (subschemaConfig.merge) {
    const hasQuery = !!doc.definitions.find(def => def.kind === Kind.OBJECT_TYPE_DEFINITION && def.name.value === 'Query');
    typeDefs += `
      union _Entity = ${Object.keys(subschemaConfig.merge).join(' | ')}
      ${hasQuery ? 'extend' : ''} type Query { _entities(representations: [_Any!]!): [_Entity]! }
    `;
  }

  subschemaConfig.schema = buildSchema(typeDefs);
  subschemaConfig.executor = executor;
  subschemaConfig.batch = true;
  return subschemaConfig;
}

function parseSelectionSetKeys(selectionSet) {
  return parse(selectionSet).definitions[0].selectionSet.selections.map(sel => sel.name.value);
}

function pick(obj, keys) {
  return keys.reduce((memo, key) => {
    memo[key] = obj[key];
    return memo;
  }, {});
}
