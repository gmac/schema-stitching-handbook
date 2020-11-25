const { makeExecutableSchema } = require('@graphql-tools/schema');
const NotFoundError = require('../../lib/not_found_error');
const readFileSync = require('../../lib/read_file_sync');
const typeDefs = readFileSync(__dirname, 'schema.graphql');

// data fixtures
const products = [
  { upc: '1', name: 'Cookbook', msrp: 15.99 },
  { upc: '2', name: 'Toothbrush', msrp: 3.99 },
];

// graphql resolvers
const resolvers = {
  Query: {
    product: (root, { upc }) => products.find(p => p.upc === upc) || new NotFoundError()
  }
};

module.exports = makeExecutableSchema({ typeDefs, resolvers });
