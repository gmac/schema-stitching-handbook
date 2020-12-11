const { makeExecutableSchema } = require('@graphql-tools/schema');
const readFileSync = require('../../lib/read_file_sync');

module.exports = function makeRegistrySchema(registry) {
  return makeExecutableSchema({
    typeDefs: readFileSync(__dirname, 'schema.graphql'),
    resolvers: {
      Query: {
        remoteServices: () => registry.services,
      },
      Mutation: {
        async createSchemaReleaseBranch(root, { name, message }) {
          return registry.createReleaseBranch(name, message);
        },
        async updateSchemaReleaseBranch(root, { name, message }) {
          return registry.updateReleaseBranch(name, message);
        },
        async createOrUpdateSchemaReleaseBranch(root, { name, message }) {
          return registry.createOrUpdateReleaseBranch(name, message);
        },
        async mergeSchemaReleaseBranch(root, { name, message }) {
          return registry.mergeReleaseBranch(name, message);
        }
      }
    }
  });
};
