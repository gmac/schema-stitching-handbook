const { makeExecutableSchema } = require('@graphql-tools/schema');
const { stitchingDirectives } = require('@graphql-tools/stitching-directives');
const NotFoundError = require('../../lib/not_found_error');
const readFileSync = require('../../lib/read_file_sync');

const { stitchingDirectivesTypeDefs, stitchingDirectivesValidator } = stitchingDirectives();

const typeDefs = `
  ${stitchingDirectivesTypeDefs}
  ${readFileSync(__dirname, 'schema.graphql')}
`;

const users = [
  { id: '1', name: 'Ada Lovelace', username: '@ada' },
  { id: '2', name: 'Alan Turing', username: '@complete' },
];

module.exports = makeExecutableSchema({
  schemaTransforms: [stitchingDirectivesValidator],
  typeDefs,
  resolvers: {
    Query: {
      me: () => users[0],
      _users: (_root, { keys }) => keys.map(key => users.find(user => user.id === key.id) || new NotFoundError()),
      _sdl: () => typeDefs,
    }
  }
});
