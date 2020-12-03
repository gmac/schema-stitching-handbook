const { makeExecutableSchema } = require('@graphql-tools/schema');
const NotFoundError = require('../../lib/not_found_error');
const readFileSync = require('../../lib/read_file_sync');
const typeDefs = readFileSync(__dirname, 'schema.graphql');

// data fixtures
const storefronts = [
  { id: '1', name: 'The Product Store' },
  { id: '2', name: 'eShoppe' },
];

module.exports = makeExecutableSchema({
  typeDefs,
  resolvers: {
    Query: {
      storefront: (root, { id }) => storefronts.find(s => s.id === id) || new NotFoundError(),
      _sdl: () => typeDefs,
    }
  }
});
