const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const { stitchSchemas } = require('@graphql-tools/stitch');
const { stitchingDirectives } = require('@graphql-tools/stitching-directives');
const { buildSchema } = require('graphql');

const readFileSync = require('./lib/read_file_sync');

const { stitchingDirectivesTypeDefs, stitchingDirectivesTransformer } = stitchingDirectives();

const makeRemoteExecutorWithTimeout = require('./lib/make_remote_executor_with_timeout');

const SDL_TIMEOUT = 200;
const OPERATION_TIMEOUT = 5000;

const typeDefs = `
  ${stitchingDirectivesTypeDefs}
  ${readFileSync(__dirname, 'schema.graphql')}
`;

const resolvers = {
  Query: {
    allEndpoints: () => endpoints,
    endpoints: (_root, { urls }) => urls.map((url) => endpoints.find(endpoint => endpoint.url === url) || new NotFoundError()),
  },
  Mutation: {
    addEndpoint: async (_root, { url }) => {
      if (urls.find(u => u === url) === undefined) {
        urls.push(urls);
      }
      await refreshEndpointsAndSchema();
      return { success: true };
    },
    removeEndpoint: async (_root, { url }) => {
      const index = urls.findIndex(u => u === url);
      if (index !== undefined) {
        urls.splice(index, 1);
      }
      await refreshEndpointsAndSchema();
      return { success: true };
    },
  },
}

let urls = [
  'http://localhost:4001/graphql',
  'http://localhost:4002/graphql',
  'http://localhost:4003/graphql',
  'http://localhost:4004/graphql',
];

let endpoints;
let gatewaySchema;

refreshEndpointsAndSchema().then(() => {
  const app = express();
  app.use('/graphql', graphqlHTTP(() => ({ schema: gatewaySchema, graphiql: true })));
  app.listen(4000);
  console.log('gateway running on port 4000');
  setTimeout(continueRefreshLoop, 1000);
});

async function refreshEndpointsAndSchema() {
  console.log('fetching SDL from services');
  const sdlPromises = urls.map(url => fetchRemoteSDLOrError(makeRemoteExecutorWithTimeout(url, SDL_TIMEOUT)));

  const sdls = await Promise.all(sdlPromises);

  endpoints = [];
  sdls.forEach((sdl, index) => {
    const url = urls[index];
    if (sdl instanceof Error) {
      console.log(`Failed to retrieve SDL from "${url}". Received error:\n  ${sdl}`);
    } else {
      endpoints.push({
        url,
        sdl,
      });
      console.log(`added endpoint "${url}"`);
    }
  });

  const subschemas = endpoints.map(endpoint => ({
    schema: buildSchema(endpoint.sdl),
    executor: makeRemoteExecutorWithTimeout(endpoint.url, OPERATION_TIMEOUT),
    batching: true,  
  }));

  console.log('refreshing schema...');
  gatewaySchema = stitchSchemas({
    subschemas,
    typeDefs,
    resolvers,
    subschemaConfigTransforms: [stitchingDirectivesTransformer],
  });
  console.log('schema refreshed!');
}

async function continueRefreshLoop() {
  await refreshEndpointsAndSchema();
  setTimeout(continueRefreshLoop, 1000);
}

// Custom fetcher that queries a remote schema for an "sdl" field.
// This is NOT a standard GraphQL convention – it's just a simple way
// for a remote API to provide its own schema, complete with custom directives.
async function fetchRemoteSDLOrError(executor) {
  const result = await executor({ document: '{ _sdl }' });
  return result instanceof Error ? result : result.data._sdl;
}