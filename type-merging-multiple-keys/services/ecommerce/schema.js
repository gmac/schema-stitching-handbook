const { makeExecutableSchema } = require('@graphql-tools/schema');
const { stitchingDirectives } = require('@graphql-tools/stitching-directives');
const NotFoundError = require('../../lib/not_found_error');
const readFileSync = require('../../lib/read_file_sync');

const { stitchingDirectivesTypeDefs, stitchingDirectivesValidator } = stitchingDirectives();

const typeDefs = `
  ${stitchingDirectivesTypeDefs}
  ${readFileSync(__dirname, 'schema.graphql')}
`;

const products = [
  { id: '101', upc: '1', retailPrice: 879, unitsInStock: 23 },
  { id: '102', upc: '2', retailPrice: 1279, unitsInStock: 77 },
  { id: '103', upc: '3', retailPrice: 54, unitsInStock: 0 },
];

module.exports = makeExecutableSchema({
  schemaTransforms: [stitchingDirectivesValidator],
  typeDefs,
  resolvers: {
    Query: {
      productsByKey: (_root, { keys }) => {
        console.log(keys);
        return keys.map(k => products.find(p => p.id === k.id || p.upc === k.upc) || new NotFoundError());
      },
      _sdl: () => typeDefs,
    },
  }
});
