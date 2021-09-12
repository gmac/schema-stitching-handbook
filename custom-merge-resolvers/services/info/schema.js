const { makeExecutableSchema } = require('@graphql-tools/schema');
const readFileSync = require('../../lib/read_file_sync');
const typeDefs = readFileSync(__dirname, 'schema.graphql');

const products = [
  { id: '1', title: 'Wallet' },
  { id: '2', title: 'Watch' },
  { id: '3', title: 'Hat' },
];

module.exports = makeExecutableSchema({
  typeDefs,
  resolvers: {
    Query: {
      productsInfo: (root, { whereIn }) => products.filter(p => whereIn.includes(p.id)),
    }
  }
});
