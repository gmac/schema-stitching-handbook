const { buildSchema } = require('graphql');
const { stitchSchemas } = require('@graphql-tools/stitch');
const { stitchingDirectives } = require('@graphql-tools/stitching-directives');
const { SchemaRegistry } = require('./lib/schema_registry');
const makeRemoteExecutor = require('./lib/make_remote_executor');

const { stitchingDirectivesTypeDefs, stitchingDirectivesTransformer } = stitchingDirectives();

const registry = new SchemaRegistry({
  env: 'development',
  owner: 'gmac',
  repo: 'test-schema-registry',
  token: '636621ae59d12d475cba5e367868de1638aed225',
  mainBranch: 'main',
  registryPath: 'graphql/remote_schemas',
  services: [
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
  buildSchema: (endpoints) => {
    return stitchSchemas({
      subschemaConfigTransforms: [stitchingDirectivesTransformer],
      subschemas: endpoints.map(({ url, sdl }) => ({
        schema: buildSchema(sdl),
        executor: makeRemoteExecutor(url, { timeout: 5000 }),
        batch: true,
      }))
    });
  }
});

async function go() {
  return registry.loadLocalEndpoints();

  // return registry.loadRegistry();
  // return registry.createRelease(`my-test-release-${Date.now()}`, [
  //   { path: 'test/file.md', content: '# Make this work!' }
  // ]);
}

go().then(res => console.log(res));
