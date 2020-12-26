const { stitchSchemas } = require('@graphql-tools/stitch');
const { stitchingDirectives } = require('@graphql-tools/stitching-directives');
const { buildSchema } = require('graphql');
const makeServer = require('./lib/make_server');
const makeRemoteExecutor = require('./lib/make_remote_executor');

const { stitchingDirectivesTransformer } = stitchingDirectives();

async function makeGatewaySchema() {
  const accountsExec = makeRemoteExecutor('http://localhost:4001/graphql');
  const inventoryExec = makeRemoteExecutor('http://localhost:4002/graphql');
  const productsExec = makeRemoteExecutor('http://localhost:4003/graphql');
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

// fetch remote schemas with a retry loop
// (allows the gateway to wait for all services to startup)
async function fetchRemoteSchema(executor) {
  return new Promise((resolve, reject) => {
    async function next(attempt=1) {
      try {
        const { data } = await executor({ document: '{ _sdl }' });
        resolve(buildSchema(data._sdl));
        // Or:
        //
        // resolve(buildSchema(data._sdl, { assumeValidSDL: true }));
        //
        // `assumeValidSDL: true` is necessary if a code-first schema implements directive
        // usage, either directly or by extensions, but not addition of actual custom
        // directives. Alternatively, a new schema with the directives could be created
        // from the nexus schema using:
        //
        // const newSchema = new GraphQLSchema({
        //   ...originalSchema.toConfig(),
        //   directives: [...originalSchema.getDirectives(), ...allStitchingDirectives]
        // });
        //
      } catch (err) {
        if (attempt >= 10) reject(err);
        setTimeout(() => next(attempt+1), 300);
      }
    }
    next();
  });
}

makeGatewaySchema().then(schema => makeServer(schema, 'gateway', 4000));
