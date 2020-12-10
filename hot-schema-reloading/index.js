const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const { stitchSchemas } = require('@graphql-tools/stitch');
const { stitchingDirectives } = require('@graphql-tools/stitching-directives');
const { buildSchema } = require('graphql');
const SchemaLoader = require('./lib/schema_loader');
const makeRemoteExecutor = require('./lib/make_remote_executor');
const makeEndpointsSchema = require('./services/endpoints/schema');

const { stitchingDirectivesTransformer } = stitchingDirectives();

const loader = new SchemaLoader({
  endpoints: [
    'http://localhost:4001/graphql',
    'http://localhost:4002/graphql',
  ],
  buildSchema: (loadedEndpoints) => {
    const subschemas = loadedEndpoints.map(({ sdl, url }) => ({
      schema: buildSchema(sdl),
      executor: makeRemoteExecutor(url, { timeout: 5000 }),
      batch: true,
    }));

    subschemas.push(makeEndpointsSchema(loader));

    return stitchSchemas({
      subschemaConfigTransforms: [stitchingDirectivesTransformer],
      subschemas,
    });
  }
});

loader.reload().then(() => {
  const app = express();
  app.use('/graphql', graphqlHTTP(() => ({ schema: loader.schema, graphiql: true })));
  app.listen(4000, () => console.log('gateway running http://localhost:4000/graphql'));
  loader.autoRefresh();
});
