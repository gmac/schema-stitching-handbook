const waitOn = require('wait-on');
const { stitchSchemas } = require('@graphql-tools/stitch');
const { stitchingDirectives } = require('@graphql-tools/stitching-directives');
const { stitchingDirectivesTransformer } = stitchingDirectives();
const { buildSchema } = require('graphql');
const makeServer = require('./lib/make_server');
const makeRemoteExecutor = require('./lib/make_remote_executor');
const federationToStitchingSDL = require('federation-to-stitching-sdl');

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

waitOn({ resources: [4001, 4002, 4003].map(p => `tcp:${p}`) }, async () => {
  makeServer(await makeGatewaySchema(), 'gateway', 4000);
});
