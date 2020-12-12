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
      user: (_root, { id }) => users.find(user => user.id === id) || new NotFoundError(),
      _sdl: () => typeDefs,
    }
  }
});
