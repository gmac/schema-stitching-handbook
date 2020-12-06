const gql = require('graphql-tag');
const { buildFederatedSchema } = require('@apollo/federation');
const NotFoundError = require('../../lib/not_found_error');
const readFileSync = require('../../lib/read_file_sync');

const reviews = [
  { id: '1', userId: '1', productUpc: '1', body: 'Love it!' },
  { id: '2', userId: '1', productUpc: '2', body: 'Too expensive.' },
  { id: '3', userId: '2', productUpc: '3', body: 'Could be better.' },
  { id: '4', userId: '3', productUpc: '1', body: 'Prefer something else.' },
];

module.exports = buildFederatedSchema({
  typeDefs: gql(readFileSync(__dirname, 'schema.graphql')),
  resolvers: {
    Review: {
      __resolveReference: ({ id }) => reviews.find(review => review.id === id),
      author: (review) => ({ id: review.userId }),
      product: (review) => ({ upc: review.productUpc }),
    },
    Product: {
      __resolveReference: (product) => {
        console.log(product)
        return product;
      },
      reviews: (product) => reviews.filter(review => review.productUpc === product.upc),
      featured: (product) => {
        console.log('featured', product)
        return product.unitsSold > 1
      },
    },
    User: {
      reviews: (user) => reviews.filter(review => review.userId === user.id),
    },
  }
});
