const { makeExecutableSchema } = require('@graphql-tools/schema');
const { stitchingDirectives } = require('@graphql-tools/stitching-directives');
const NotFoundError = require('../../lib/not_found_error');
const readFileSync = require('../../lib/read_file_sync');

const { stitchingDirectivesTypeDefs, stitchingDirectivesValidator } = stitchingDirectives();

const typeDefs = `
  ${stitchingDirectivesTypeDefs}
  ${readFileSync(__dirname, 'schema.graphql')}
`;

const reviews = [
  { id: '1', authorId: '1', productUpc: '1', body: 'Love it!' },
  { id: '2', authorId: '1', productUpc: '2', body: 'Too expensive.' },
  { id: '3', authorId: '2', productUpc: '3', body: 'Could be better.' },
  { id: '4', authorId: '2', productUpc: '1', body: 'Prefer something else.' },
];

module.exports = makeExecutableSchema({
  schemaTransforms: [stitchingDirectivesValidator],
  typeDefs,
  resolvers: {
    Review: {
      author: (review) => ({ id: review.authorId }),
      product: (review) => ({ upc: review.productUpc }),
    },
    User: {
      reviews: (user) => reviews.filter(review => review.authorId === user.id),
      totalReviews: (user) => reviews.filter(review => review.authorId === user.id).length,
    },
    Product: {
      reviews: (product) => reviews.filter(review => review.productUpc === product.upc),
    },
    Query: {
      review: (_root, { id }) => reviews.find(review => review.id === id) || new NotFoundError(),
      _users: (_root, { keys }) => {
        console.log(keys);
        return keys
      },
      _products: (_root, { input }) => input.keys,
      _sdl: () => typeDefs,
    },
  }
});
