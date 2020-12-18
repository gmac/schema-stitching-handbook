const { makeExecutableSchema } = require('@graphql-tools/schema');
const NotFoundError = require('../../lib/not_found_error');
const readFileSync = require('../../lib/read_file_sync');
const typeDefs = readFileSync(__dirname, 'schema.graphql');

// data fixtures
const products = [
  { id: '1', name: 'iPhone', price: 699.99 },
  { id: '2', name: 'Apple Watch', price: 399.99 },
  { id: '3', name: 'Super Baking Cookbook', price: 15.99 },
  { id: '4', name: 'Best Selling Novel', price: 7.99 },
  { id: '5', name: 'iOS Survival Guide', price: 24.99 },
];

module.exports = makeExecutableSchema({
  typeDefs,
  resolvers: {
    Query: {
      products: (root, { ids }) => ids.map(id => products.find(p => p.id === id) || new NotFoundError()),
    }
  }
});
