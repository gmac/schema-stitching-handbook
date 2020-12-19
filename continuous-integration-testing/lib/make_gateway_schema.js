const { buildSchema } = require('graphql');
const { stitchSchemas } = require('@graphql-tools/stitch');
const { stitchingDirectives } = require('@graphql-tools/stitching-directives');
const { stitchingDirectivesTransformer } = stitchingDirectives();

const services = [
  {
    name: 'inventory',
    url: {
      development: 'https://localhost:4001/graphql',
      production: 'https://localhost:4001/graphql?env=production',
    }
  },
  {
    name: 'products',
    url: {
      development: 'https://localhost:4002/graphql',
      production: 'https://localhost:4002/graphql?env=production',
    }
  }
];

module.exports = function makeGatewaySchema() {
  const subschemas = services.map(({ url, sdl }) => ({
    schema: buildSchema(sdl),
    executor: makeRemoteExecutor(url, { timeout: 5000 }),
    batch: true,
  }));

  return stitchSchemas({
    subschemaConfigTransforms: [stitchingDirectivesTransformer],
    subschemas,
    // Includes a "reload" mutation directly in the gateway proxy layer...
    // allows a reload to be triggered manually rather than just by polling
    // (filter this mutation out of public APIs!)
    typeDefs: 'type Mutation { _reloadGateway: Boolean! }',
    resolvers: {
      Mutation: {
        _reloadGateway: async () => !!await registry.reload()
      }
    }
  });
};
