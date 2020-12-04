const gql = require('graphql-tag');
const { buildFederatedSchema } = require('@apollo/federation');
const NotFoundError = require('../../lib/not_found_error');
const readFileSync = require('../../lib/read_file_sync');

const users = [
  { id: '1', username: 'hanshotfirst', email: 'han@solo.me' },
  { id: '2', username: 'bigvader23', email: 'vader@darkside.io' },
  { id: '3', username: 'yodamecrazy', email: 'yoda@theforce.net' },
];

module.exports = buildFederatedSchema({
  typeDefs: gql(readFileSync(__dirname, 'schema.graphql')),
  resolvers: {
    User: {
      __resolveReference: ({ id }) => users.find(user => user.id === id),
    },
    Query: {
      user: (_root, { id }) => users.find(user => user.id === id) || new NotFoundError(),
      users: (_root, { ids }) => ids.map(id => users.find(user => user.id === id) || new NotFoundError()),
    },
  }
});
