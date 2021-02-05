const { makeExecutableSchema } = require('@graphql-tools/schema');
const NotFoundError = require('../../lib/not_found_error');
const readFileSync = require('../../lib/read_file_sync');

const reviews = [
  { id: '1', productId: '101', body: 'Love it!' },
  { id: '2', productId: '102', body: 'Too expensive.' },
  { id: '3', productId: '103', body: 'Could be better.' },
  { id: '4', productId: '101', body: 'Prefer something else.' },
];

module.exports = makeExecutableSchema({
  typeDefs: readFileSync(__dirname, 'schema.graphql'),
  resolvers: {
    Review: {
      product: (review) => ({ id: review.productId }),
    },
    Product: {
      reviews: (product) => reviews.filter(review => review.productId === product.id),
    },
    Query: {
      review: (_root, { id }) => reviews.find(review => review.id === id) || new NotFoundError(),
      productsById: (_root, { ids }) => ids.map(id => ({ id })),
    },
  }
});
