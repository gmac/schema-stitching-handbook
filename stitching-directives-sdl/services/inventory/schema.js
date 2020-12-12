const { makeExecutableSchema } = require('@graphql-tools/schema');
const { stitchingDirectives } = require('@graphql-tools/stitching-directives');
const NotFoundError = require('../../lib/not_found_error');
const readFileSync = require('../../lib/read_file_sync');

const { stitchingDirectivesTypeDefs, stitchingDirectivesValidator } = stitchingDirectives();

const typeDefs = `
  ${stitchingDirectivesTypeDefs}
  ${readFileSync(__dirname, 'schema.graphql')}
`;

const inventories = [
  { upc: '1', unitsInStock: 3 },
  { upc: '2', unitsInStock: 0 },
  { upc: '3', unitsInStock: 5 },
];

module.exports = makeExecutableSchema({
  schemaTransforms: [stitchingDirectivesValidator],
  typeDefs,
  resolvers: {
    Product: {
      inStock: (product) => product.unitsInStock > 0,
      shippingEstimate(product) {
        // free for expensive items, otherwise estimate based on weight
        return product.price > 1000 ? 0 : Math.round(product.weight * 0.5);
      }
    },
    Query: {
      mostStockedProduct: () => inventories.reduce((acc, i) => acc.unitsInStock >= i.unitsInStock ? acc : i, inventories[0]),
      _products: (_root, { keys }) => keys.map(key => {
        const inventory = inventories.find(i => i.upc === key.upc);
        return inventory ? { ...key, ...inventory } : new NotFoundError();
      }),
      _sdl: () => typeDefs,
    },
  }
});
