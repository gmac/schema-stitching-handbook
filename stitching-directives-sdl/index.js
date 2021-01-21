const waitOn = require('wait-on');
const { stitchSchemas } = require('@graphql-tools/stitch');
const { stitchingDirectives } = require('@graphql-tools/stitching-directives');
const { buildSchema, printSchema } = require('graphql');
const makeServer = require('./lib/make_server');
const makeRemoteExecutor = require('./lib/make_remote_executor');

const { stitchingDirectivesTransformer } = stitchingDirectives();

async function makeGatewaySchema() {
  const accountsExec = makeRemoteExecutor('http://localhost:4001/graphql');
  const productsExec = makeRemoteExecutor('http://localhost:4003/graphql');
  const inventoryExec = makeRemoteExecutor('http://localhost:4002/graphql');
  const reviewsExec = makeRemoteExecutor('http://localhost:4004/graphql');

  return stitchSchemas({
    subschemaConfigTransforms: [stitchingDirectivesTransformer],
    subschemas: [
      {
        schema: await fetchRemoteSchema(accountsExec),
        executor: accountsExec,
      },
      {
        schema: await fetchRemoteSchema(inventoryExec),
        executor: inventoryExec,
      },
      {
        schema: await fetchRemoteSchema(productsExec),
        executor: productsExec,
      },
      {
        schema: await fetchRemoteSchema(reviewsExec),
        executor: reviewsExec,
      }
    ]
  });
}

async function fetchRemoteSchema(executor) {
  const { data } = await executor({ document: '{ _sdl }' });
  return buildSchema(data._sdl);
}

waitOn({ resources: [4001, 4002, 4003, 4004].map(p => `tcp:${p}`) }, async () => {
  makeServer(await makeGatewaySchema(), 'gateway', 4000);
});
