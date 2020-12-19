const { addMocksToSchema } = require('@graphql-tools/mock');
const { graphql, buildSchema } = require('graphql');
const readFileSync = require('../lib/read_file_sync');

test('adds 1 + 2 to equal 3', async () => {
  const mockedSchema = addMocksToSchema({
    schema: buildSchema(readFileSync(__dirname, '../remote_schemas/inventory.graphql')),
    mocks: {
      Product: () => ({ upc: '1', inStock: true })
    }
  });
  const result = await graphql(mockedSchema, '{ mostStockedProduct { upc inStock } }');
  console.log(result);

  expect(1 + 2).toBe(3);
});
