const { makeExecutableSchema } = require('@graphql-tools/schema');
const NotFoundError = require('../../lib/not_found_error');
const readFileSync = require('../../lib/read_file_sync');

const products = [
  { upc: '1', name: 'Table', price: 899, weight: 100 },
  { upc: '2', name: 'Couch', price: 1299, weight: 1000 },
  { upc: '3', name: 'Chair', price: 54, weight: 50 },
];

module.exports = makeExecutableSchema({
  typeDefs: readFileSync(__dirname, 'schema.graphql'),
  resolvers: {
    Query: {
      productsByUpc: (_root, { upcs }) => upcs.map((upc) => products.find(product => product.upc === upc) || new NotFoundError()),
    },
  }
});
