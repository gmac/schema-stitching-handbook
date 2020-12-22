const {
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  GraphQLID,
  specifiedDirectives
} = require('graphql');
const { stitchingDirectives } = require('@graphql-tools/stitching-directives');
const { printSchemaWithDirectives } = require('@graphql-tools/utils');
const NotFoundError = require('../../lib/not_found_error');

const { allDirectives: directives, stitchingDirectivesValidator } = stitchingDirectives();

const users = [
  { id: '1', name: 'Ada Lovelace', username: '@ada' },
  { id: '2', name: 'Alan Turing', username: '@complete' },
];

const accountsSchemaTypes = Object.create(null);

accountsSchemaTypes._Key = new GraphQLScalarType({
  name: '_Key',
});
accountsSchemaTypes.Query = new GraphQLObjectType({
  name: 'Query',
  fields: () => ({
    me: {
      type: accountsSchemaTypes.User,
      resolve: () => users[0],
    },
    user: {
      type: accountsSchemaTypes.User,
      args: {
        id: {
          type: new GraphQLNonNull(GraphQLID),
        },
      },
      resolve: (_root, { id }) => users.find(user => user.id === id) || new NotFoundError(),
      extensions: { directives: { merge: { keyField: 'id' } } },
    },
    _sdl: {
      type: new GraphQLNonNull(GraphQLString),
      resolve: (_root, _args, _context, info) => printSchemaWithDirectives(info.schema), 
    },
  }),
});

accountsSchemaTypes.User = new GraphQLObjectType({
  name: 'User',
  fields: () => ({
    id: { type: GraphQLID },
    name: { type: GraphQLString },
    username: { type: GraphQLString },
  }),
  extensions: {
    directives: {
      key: {
        selectionSet: '{ id }',
      },
    },
  },
});

const accountsSchema = new GraphQLSchema({
  query: accountsSchemaTypes.Query,
  directives: [...specifiedDirectives, ...directives],
});

module.exports = stitchingDirectivesValidator(accountsSchema);