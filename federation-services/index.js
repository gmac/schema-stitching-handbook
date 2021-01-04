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
      fetchFederationSubchema(makeRemoteExecutor('http://localhost:4001/graphql', 'products')),
      fetchFederationSubchema(makeRemoteExecutor('http://localhost:4002/graphql', 'reviews')),
      fetchFederationSubchema(makeRemoteExecutor('http://localhost:4003/graphql', 'users')),
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

makeGatewaySchema().then(schema => makeServer(schema, 'gateway', 4000));
