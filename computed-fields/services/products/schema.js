const { makeExecutableSchema } = require('@graphql-tools/schema');
const NotFoundError = require('../../lib/not_found_error');
const readFileSync = require('../../lib/read_file_sync');
const typeDefs = readFileSync(__dirname, 'schema.graphql');

// data fixtures
const products = [
  { upc: '1', name: 'iPhone', price: 699.99, categoryId: null, metadataIds: [] },
  { upc: '2', name: 'The Best Baking Cookbook', price: 15.99, categoryId: '2', metadataIds: ['3', '4'] },
  { upc: '3', name: 'Argentina Guidebook', price: 24.99, categoryId: '3', metadataIds: ['5'] },
  { upc: '4', name: 'Soccer Jersey', price: 47.99, categoryId: '1', metadataIds: ['1', '2'] },
];

module.exports = makeExecutableSchema({
  typeDefs,
  resolvers: {
    Query: {
      products: (root, { upcs }) => upcs.map(upc => products.find(p => p.upc === upc) || new NotFoundError())
    }
  }
});
