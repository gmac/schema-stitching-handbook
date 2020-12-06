const { parse, print, Kind, buildSchema } = require('graphql');

// Federation services are actually fairly complex,
// as the `buildFederatedSchema` helper does a fair amount
// of hidden work to setup the Federation schema specification:
// https://www.apollographql.com/docs/federation/federation-spec/#federation-schema-specification
module.exports = async function makeFederationSubchema(executor, log=false) {
  // The Federation spec includes a query used to fetch a service's SDL, however...
  // these SDLs are incomplete because they omit the federation spec itself.
  // To make the federation SDL into a valid and parsable GraphQL schema,
  // we have to fill in the missing details from the specification...
  const result = await executor({ document: '{ _service { sdl } }' });
  const doc = parse(result.data._service.sdl);
  const subschemaConfig = {};
  let hasQuery = false;

  doc.definitions.forEach(typeDef => {
    // eliminate type extensions ("extends" keyword),
    // which are invalid without a local base type.
    // stitching perfoms a flat type merge, so needs no extensions.
    typeDef.kind = typeDef.kind.replace(/Extension$/, 'Definition');

    if (typeDef.kind !== Kind.OBJECT_TYPE_DEFINITION) return;

    const typeName = typeDef.name.value;
    hasQuery = hasQuery || typeName === 'Query';

    // find object definitions that include one or more @key directives
    // these are federation "entities" that may be targeted by the "_entities" service
    const keys = typeDef.directives
      .map(dir => dir.name.value === 'key' ? dir.arguments[0].value.value : null)
      .filter(Boolean);

    if (!keys.length) return;

    // setup merged type configuration for all federation entities
    const selectionSet = `{ ${ keys.join(' ') } }`;
    const keyFields = parse(selectionSet).definitions[0].selectionSet.selections.map(sel => sel.name.value);
    const mergedTypeConfig = {
      selectionSet,
      fieldName: '_entities',
      key: (obj) => ({ __typename: typeName, ...pick(obj, keyFields) }),
      argsFromKeys: (representations) => ({ representations }),
    };

    // remove @external fields
    typeDef.fields = typeDef.fields.filter(fieldDef => {
      const external = fieldDef.directives.find(dir => dir.name.value === 'external');
      return !external || keyFields.includes(fieldDef.name.value);
    });

    // build computed fields for @requires
    typeDef.fields.forEach(fieldDef => {
      const requires = fieldDef.directives.find(dir => dir.name.value === 'requires');
      if (requires) {
        const selectionSet = `{ ${requires.arguments[0].value.value} }`;
        parse(selectionSet).definitions[0].selectionSet.selections.forEach(sel => {
          keyFields.push(sel.name.value);
        });

        mergedTypeConfig.computedFields = mergedTypeConfig.computedFields || {};
        mergedTypeConfig.computedFields[fieldDef.name.value] = { selectionSet };
      }
    });

    subschemaConfig.merge = subschemaConfig.merge || {};
    subschemaConfig.merge[typeName] = mergedTypeConfig;
  });

  // Build a schema that includes the complete federation spec...
  let typeDefs = `
    scalar _Any
    scalar _FieldSet
    directive @external on FIELD_DEFINITION
    directive @requires(fields: _FieldSet!) on FIELD_DEFINITION
    directive @provides(fields: _FieldSet!) on FIELD_DEFINITION
    directive @key(fields: _FieldSet!) on OBJECT | INTERFACE
    ${print(doc)}
  `;

  // add the "_entities" service setup for all merged types.
  if (subschemaConfig.merge) {
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

function pick(obj, keys) {
  return keys.reduce((memo, key) => {
    memo[key] = obj[key];
    return memo;
  }, {});
}
