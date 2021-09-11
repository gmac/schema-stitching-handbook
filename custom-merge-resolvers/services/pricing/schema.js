const { makeExecutableSchema } = require('@graphql-tools/schema');
const readFileSync = require('../../lib/read_file_sync');
const typeDefs = readFileSync(__dirname, 'schema.graphql');

const products = [
  { id: '1', price: 14 },
  { id: '3', price: 22 },
];

module.exports = makeExecutableSchema({
  typeDefs,
  resolvers: {
    Query: {
      pricing: () => ({}),
    },
    PricingEngine: {
      products: (root, { ids }) => ids.map(id => products.find(p => p.id === id) || null),
    },
  },
});
