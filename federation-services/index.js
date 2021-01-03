const { stitchSchemas } = require('@graphql-tools/stitch');
const { stitchingDirectives } = require('@graphql-tools/stitching-directives');
const { stitchingDirectivesTransformer } = stitchingDirectives();
const { buildSchema } = require('graphql');
const makeServer = require('./lib/make_server');
const makeRemoteExecutor = require('./lib/make_remote_executor');
const federationToStitchingSDL = require('./lib/federation_to_stitching');

async function makeGatewaySchema() {
  return stitchSchemas({
    subschemaConfigTransforms: [stitchingDirectivesTransformer],
    subschemas: await Promise.all([
      fetchFederationSubchema(makeRemoteExecutor('http://localhost:4001/graphql')),
      fetchFederationSubchema(makeRemoteExecutor('http://localhost:4002/graphql')),
      fetchFederationSubchema(makeRemoteExecutor('http://localhost:4003/graphql')),
    ])
  });
}

async function fetchFederationSubchema(executor) {
  const { data } = await executor({ document: '{ _service { sdl } }' });
  const sdl = federationToStitchingSDL(data._service.sdl);
  return {
    schema: buildSchema(sdl),
    executor,
  };
}

// const { stitchingDirectives } = require('@graphql-tools/stitching-directives');
// const { stitchingDirectivesTransformer } = stitchingDirectives();
// const sdl = `
//   directive @key(selectionSet: String!) on OBJECT
//   directive @computed(selectionSet: String!) on FIELD_DEFINITION
//   directive @merge(argsExpr: String, keyArg: String, keyField: String, key: [String!], additionalArgs: String) on FIELD_DEFINITION

//   type User @key(selectionSet: "{ id }") {
//     id: ID!
//     email: String!
//     username: String!
//   }

//   scalar _Any
//   union _Entity = User

//   type Query {
//     user(id: ID!): User
//     _entities(representations: [_Any!]!): [_Entity]! @merge
//   }
// `;

// const config = stitchingDirectivesTransformer({ schema: buildSchema(sdl) });
// console.log(config.merge.User.key({ __typename: 'User', id: '123' }));

makeGatewaySchema().then(schema => makeServer(schema, 'gateway', 4000));
