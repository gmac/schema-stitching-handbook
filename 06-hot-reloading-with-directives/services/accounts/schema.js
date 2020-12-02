const { makeExecutableSchema } = require('@graphql-tools/schema');
const { stitchingDirectives } = require('@graphql-tools/stitching-directives');

const NotFoundError = require('../../lib/not_found_error');
const readFileSync = require('../../lib/read_file_sync');

const { stitchingDirectivesTypeDefs, stitchingDirectivesValidator } = stitchingDirectives();

const typeDefs = `
  ${stitchingDirectivesTypeDefs}
  ${readFileSync(__dirname, 'schema.graphql')}
`;

// data fixtures
const users = [
  {
    id: '1',
    name: 'Ada Lovelace',
    birthDate: '1815-12-10',
    username: '@ada'
  },
  {
    id: '2',
    name: 'Alan Turing',
    birthDate: '1912-06-23',
    username: '@complete',
  },
];

// graphql resolvers
const resolvers = {
  Query: {
    me: () => users[0],
    _users: (_root, { keys }) => keys.map((key) => users.find(u => u.id === key.id) || new NotFoundError()),
    _sdl: () => typeDefs,
  }
};

module.exports = makeExecutableSchema({ typeDefs, resolvers, schemaTransforms: [stitchingDirectivesValidator] });
