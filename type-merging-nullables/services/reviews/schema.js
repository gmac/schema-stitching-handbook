const { makeExecutableSchema } = require('@graphql-tools/schema');
const NotFoundError = require('../../lib/not_found_error');
const readFileSync = require('../../lib/read_file_sync');
const typeDefs = readFileSync(__dirname, 'schema.graphql');

// data fixtures
const reviews = [
  { id: '1', productUpc: '1', userId: '1', body: 'love it' },
];

module.exports = makeExecutableSchema({
  typeDefs,
  resolvers: {
    Query: {
      reviews: (root, { ids }) => ids.map(id => reviews.find(r => r.id === id) || new NotFoundError()),

      // Users will _always_ return a stub record,
      // regardless of whether there's a local representation of the user.
      // We're trusting that remote services are sending in valid User IDs...
      // Returning a stub record is necessary to fulfill the schema nullability requirement:
      // type User {
      //   reviews: [Review]!
      // }
      _users: (root, { ids }) => ids.map(id => ({ id })),

      // Products will only build a stub record when there's a local record of it,
      // otherwise, returning null without an error.
      // This allows the reviews service to have no opinions about unknown products;
      // it will neither confirm nor deny that they exist.
      // Returning null is permitted by the schema nullability spec:
      // type Product {
      //   reviews: [Review]
      // }
      _products: (root, { upcs }) => upcs.map(upc => reviews.find(r => r.productUpc === upc) ? ({ upc }) : null),
    },
    Review: {
      product: (review) => ({ upc: review.productUpc }),
      user: (review) => ({ id: review.userId }),
    },
    User: {
      reviews: (user) => reviews.filter(r => r.userId === user.id),
    },
    Product: {
      reviews: (product) => reviews.filter(r => r.productUpc === product.upc),
    },
  }
});
