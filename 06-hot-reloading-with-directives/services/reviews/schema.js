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
const usernames = [
  { id: '1', username: '@ada' },
  { id: '2', username: '@complete' },
];

const reviews = [
  {
    id: '1',
    authorId: '1',
    product: { upc: '1' },
    body: 'Love it!',
  },
  {
    id: '2',
    authorId: '1',
    product: { upc: '2' },
    body: 'Too expensive.',
  },
  {
    id: '3',
    authorId: '2',
    product: { upc: '3' },
    body: 'Could be better.',
  },
  {
    id: '4',
    authorId: '2',
    product: { upc: '1' },
    body: 'Prefer something else.',
  },
];

// graphql resolvers
const resolvers = {
  Review: {
    author: (review) => ({ __typename: 'User', id: review.authorId }),
  },
  User: {
    reviews: (user) => reviews.filter(review => review.authorId === user.id),
    numberOfReviews: (user) => reviews.filter(review => review.authorId === user.id).length,
    username: (user) => usernames.find(username => username.id === user.id) || NotFoundError,
  },
  Product: {
    reviews: (product) => reviews.filter(review => review.product.upc === product.upc),
  },
  Query: {
    _reviews: (_root, { id }) => reviews.find(review => review.id === id) || NotFoundError,
    _users: (_root, { keys }) => keys,
    _products: (_root, { input }) => input.keys,
    _sdl: () => typeDefs,
  },
};

module.exports = makeExecutableSchema({ typeDefs, resolvers, schemaTransforms: [stitchingDirectivesValidator] });
