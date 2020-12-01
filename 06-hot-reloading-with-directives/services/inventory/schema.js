const { makeExecutableSchema } = require('@graphql-tools/schema');
const { stitchingDirectives } = require('@graphql-tools/stitching-directives');

const NotFoundError = require('../../lib/not_found_error');
const readFileSync = require('../../lib/read_file_sync');

const { stitchingDirectivesTypeDefs, stitchingDirectivesValidator } = stitchingDirectives();

const typeDefs = `
  ${stitchingDirectivesTypeDefs}
  ${readFileSync(__dirname, 'schema.graphql')}
`;

// data fixtures
const inventory = [
  { upc: '1', inStock: true },
  { upc: '2', inStock: false },
  { upc: '3', inStock: true }
];

// graphql resolvers
const resolvers = {
  Product: {
    shippingEstimate: product => {
      if (product.price > 1000) {
        return 0 // free for expensive items
      }
      return Math.round(product.weight * 0.5) || null; // estimate is based on weight
    }
  },
  Query: {
    mostStockedProduct: () => inventory.find(i => i.upc === '3'),
    _products: (_root, { keys }) => {
      return keys.map(key => ({ ...key, ...inventory.find(i => i.upc === key.upc) || new NotFoundError() }));
    },
    _sdl: () => typeDefs,
  },
};

module.exports = makeExecutableSchema({ typeDefs, resolvers, schemaTransforms: [stitchingDirectivesValidator] });
