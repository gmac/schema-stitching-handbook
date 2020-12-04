const { buildSchema } = require('graphql');

// Federation services are actually fairly complex,
// as the `buildFederatedSchema` helper does a fair amount
// of hidden work to setup the Federation schema specification:
// https://www.apollographql.com/docs/federation/federation-spec/#federation-schema-specification
module.exports = async function fetchFederationSchema(executor) {
  // The Federation spec includes a query used to fetch a service's SDL, however...
  // these SDLs are incomplete because they omit the federation spec itself.
  // To make the federation SDL into a valid and parsable GraphQL schema,
  // we have to fill in the missing details from the specification...
  const result = await executor({ document: '{ _service { sdl } }' });
  const sdl = result.data._service.sdl;

  // Build a schema that includes the complete federation spec...
  // we must inspect some type information to build the required _Entity union.
  // This example hacks the process with some simple regex (an SDL parse would be better).
  // By far the easiest way to get a valid federation schema is just to introspect it!
  const hasQuery = /\btype\s+Query/.test(sdl);
  const entityDef = /\btype\s+(\w+)\s*@key/g;
  return buildSchema(`
    scalar _Any
    scalar _FieldSet
    union _Entity = ${sdl.match(entityDef).map(def => def.replace(entityDef, '$1')).join('|')}
    directive @external on FIELD_DEFINITION
    directive @requires(fields: _FieldSet!) on FIELD_DEFINITION
    directive @provides(fields: _FieldSet!) on FIELD_DEFINITION
    directive @key(fields: _FieldSet!) on OBJECT | INTERFACE
    ${hasQuery ? 'extend' : ''} type Query { _entities(representations: [_Any!]!): [_Entity]! }
    ${sdl.replace(/\bextend (type|interface)/g, '$1')}
  `);
}
