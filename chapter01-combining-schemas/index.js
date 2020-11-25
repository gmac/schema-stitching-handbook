const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const { introspectSchema } = require('@graphql-tools/wrap');
const { stitchSchemas } = require('@graphql-tools/stitch');
const { buildSchema } = require('graphql');

const makeRemoteExecutor = require('./lib/make_remote_executor');
const localExecSchema = require('./services/local/schema');

async function makeGatewaySchema() {
  // Make remote executors:
  // these are simple functions that query a remote API.
  const productsExec = makeRemoteExecutor('http://localhost:4001/graphql');
  const storefrontsExec = makeRemoteExecutor('http://localhost:4002/graphql');

  return stitchSchemas({
    subschemas: [
      {
        // 1. Introspect a remote schema, caveats:
        // - remote server must enable introspection.
        // - custom directives will not be included.
        schema: await introspectSchema(productsExec),
        executor: productsExec,
      },
      {
        // 2. Manually load a remote schema any way you want:
        // - use a dedicated GraphQL service (demonstrated here), or...
        // - load the schema from a dedicated repository.
        // once we have the remote SDL, build it into a basic schema.
        schema: buildSchema(await fetchRemoteSDL(storefrontsExec)),
        executor: storefrontsExec,
      },
      {
        // 3. Incorporate a locally-executable schema.
        // no need for a remote executor!
        schema: localExecSchema
      }
    ]
  });
}

// Custom protocol that queries a remote schema for an "sdl" field.
// This is NOT a standard convention – it's just a simple way for a remote
// to provide its own schema, complete with custom directives.
async function fetchRemoteSDL(executor) {
  const result = await executor({ document: '{ sdl }' });
  return result.data.sdl;
}

makeGatewaySchema().then(schema => {
  const app = express();
  app.use('/graphql', graphqlHTTP({ schema, graphiql: true }));
  app.listen(4000);
  console.log('gateway running on port 4000');
});
