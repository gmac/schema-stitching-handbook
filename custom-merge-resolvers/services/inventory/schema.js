const { makeExecutableSchema } = require('@graphql-tools/schema');
const readFileSync = require('../../lib/read_file_sync');
const typeDefs = readFileSync(__dirname, 'schema.graphql');

const products = [
  { id: '1', totalInventory: 1 },
  { id: '3', totalInventory: 5 },
];

module.exports = makeExecutableSchema({
  typeDefs,
  resolvers: {
    Query: {
      productsInventory: (root, { ids }) => {
        const items = ids.map(id => products.find(p => p.id === id) || null);
        return {
          total: items.length,
          items,
        };
      },
    }
  }
});
