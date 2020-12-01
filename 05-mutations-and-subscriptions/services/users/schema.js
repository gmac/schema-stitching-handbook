const { makeExecutableSchema } = require('@graphql-tools/schema');
const NotFoundError = require('../../lib/not_found_error');
const readFileSync = require('../../lib/read_file_sync');
const typeDefs = readFileSync(__dirname, 'schema.graphql');

const users = [
  { id: '1', username: 'hanshotfirst', email: 'han@solo.me' },
  { id: '2', username: 'bigvader23', email: 'vader@darkside.io' },
  { id: '3', username: 'yodamecrazy', email: 'yoda@theforce.net' },
];

module.exports = makeExecutableSchema({
  typeDefs,
  resolvers: {
    Query: {
      users: (root, { ids }) => ids.map(id => users.find(user => user.id === id) || new NotFoundError()),
    },
  }
});
