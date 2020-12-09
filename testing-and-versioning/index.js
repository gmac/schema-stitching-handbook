const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');
const { stitchSchemas } = require('@graphql-tools/stitch');
const { stitchingDirectives } = require('@graphql-tools/stitching-directives');
const SchemaRegistry = require('./lib/schema_registry');
const makeRemoteExecutor = require('./lib/make_remote_executor');
const makeRegistrySchema = require('./services/registry/schema');
const ENV = process.env.NODE_ENV || 'development';

let github;

try {
  github = require('./github.json');
} catch (err) {
  throw 'Make a local "github.json" file based on "github.template.json"';
}

const registry = new SchemaRegistry({
  env: ENV,
  github,
  endpoints: [
    {
      name: 'inventory',
      url: {
        development: 'http://localhost:4001/graphql',
        production: 'http://localhost:4001/graphql',
      }
    },
    {
      name: 'products',
      url: {
        development: 'http://localhost:4002/graphql',
        production: 'http://localhost:4002/graphql',
      }
    }
  ],
  buildSchema: async (services) => {
    const { stitchingDirectivesTransformer } = stitchingDirectives();
    const subschemas = services.map(({ url, sdl }) => ({
      schema: buildSchema(sdl),
      executor: makeRemoteExecutor(url, { timeout: 5000 }),
      batch: true,
    }));

    if (ENV === 'development') {
      subschemas.push({ schema: makeRegistrySchema(registry) });
    }

    return stitchSchemas({
      subschemaConfigTransforms: [stitchingDirectivesTransformer],
      subschemas,
    });
  }
});

registry.load().then(() => {
  const app = express();
  app.use('/graphql', graphqlHTTP(() => ({ schema: registry.schema, graphiql: true })));
  app.listen(4000, () => console.log('gateway running http://localhost:4000/graphql'));
  if (ENV === 'production') {
    registry.autoRefresh();
  }
});
