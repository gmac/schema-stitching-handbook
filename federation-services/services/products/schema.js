const gql = require('graphql-tag');
const { buildFederatedSchema } = require('@apollo/federation');
const NotFoundError = require('../../lib/not_found_error');
const readFileSync = require('../../lib/read_file_sync');

const products = [
  { upc: '1', name: 'iPhone', price: 699.99 },
  { upc: '2', name: 'Super Baking Cookbook', price: 15.99 },
  { upc: '3', name: 'Best Selling Novel', price: 7.99 },
  { upc: '4', name: 'iOS Survival Guide', price: 24.99 },
];

const productPurchases = [
  { productUpc: '1', userId: '1' },
  { productUpc: '4', userId: '1' },
  { productUpc: '1', userId: '2' },
  { productUpc: '3', userId: '2' },
  { productUpc: '2', userId: '3' },
];

module.exports = buildFederatedSchema({
  typeDefs: gql(readFileSync(__dirname, 'schema.graphql')),
  resolvers: {
    Product: {
      __resolveReference: ({ upc }) => products.find(product => product.upc === upc),
    },
    User: {
      recentPurchases(user) {
        const upcs = productPurchases.filter(({ userId }) => userId === user.id).map(({ productUpc }) => productUpc);
        return upcs.map(upc => products.find(p => p.upc === upc) || new NotFoundError());
      }
    },
    Query: {
      product: (_root, { upc }) => products.find(p => p.upc === upc) || new NotFoundError(),
    },
  }
});
