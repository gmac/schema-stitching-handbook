const { makeExecutableSchema } = require('@graphql-tools/schema');
const NotFoundError = require('../../lib/not_found_error');
const readFileSync = require('../../lib/read_file_sync');
const typeDefs = readFileSync(__dirname, 'schema.graphql');

// data fixtures
const users = [
  { id: '1', username: 'gthreepwood' },
  { id: '2', username: 'govmarley' },
  { id: '3', username: 'gplechuck' },
];

module.exports = makeExecutableSchema({
  typeDefs,
  resolvers: {
    User: {
      users: (root, { ids }) => ids.map(id => users.find(u => u.id === id) || new NotFoundError()),
    }
  }
});
