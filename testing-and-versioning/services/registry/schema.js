const { makeExecutableSchema } = require('@graphql-tools/schema');
const readFileSync = require('../../lib/read_file_sync');

module.exports = function makeRegistrySchema(registry) {
  return makeExecutableSchema({
    typeDefs: readFileSync(__dirname, 'schema.graphql'),
    resolvers: {
      Query: {
        async remoteServices() {
          await registry.load();
          return registry.services;
        }
      },
      Mutation: {
        async createSchemaVersion(root, { name, message }) {
          await registry.load();
          return registry.createRelease(name, message);
        },
        async updateSchemaVersion(root, { name, message }) {
          await registry.load();
          return registry.updateRelease(name, message);
        },
        async createOrUpdateSchemaVersion(root, { name, message }) {
          await registry.load();
          return registry.createOrUpdateRelease(name, message);
        }
      }
    }
  });
};
