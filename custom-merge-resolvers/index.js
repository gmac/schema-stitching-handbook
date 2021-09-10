const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const { stitchSchemas } = require('@graphql-tools/stitch');

const infoSchema = require('./services/info/schema');
const inventorySchema = require('./services/inventory/schema');
const createInventoryResolver = require('./services/inventory/resolve');
const pricingSchema = require('./services/pricing/schema');

function makeGatewaySchema() {
  // For simplicity, all services run locally in this example.
  // Any of these services could easily be turned into a remote server (see Example 1).
  return stitchSchemas({
    subschemas: [
      {
        schema: infoSchema,
        merge: {
          Product: {
            selectionSet: '{ id }',
            fieldName: 'productsInfo',
            key: ({ id }) => id,
            argsFromKeys: (ids) => ({ whereIn: ids }),
            valuesFromResults: (results, keys) => {
              const valuesByKey = Object.create(null);
              for (const val of results) valuesByKey[val.id] = val;
              return keys.map(key => valuesByKey[key] || null);
            },
          },
        },
      },
      {
        schema: inventorySchema,
        merge: {
          Product: {
            selectionSet: '{ id }',
            key: ({ id }) => id,
            resolve: createInventoryResolver({
              fieldName: 'productsInventory',
              argsFromKeys: (ids) => ({ ids }),
            }),
          },
        },
      },
      // {
      //   schema: pricingSchema,
      //   merge: {
      //     User: {
      //       selectionSet: '{ id }',
      //       fieldName: 'users',
      //       key: ({ id }) => id,
      //       argsFromKeys: (ids) => ({ ids }),
      //     },
      //   },
      // },
    ]
  });
}

const app = express();
app.use('/graphql', graphqlHTTP({ schema: makeGatewaySchema(), graphiql: true }));
app.listen(4000, () => console.log('gateway running at http://localhost:4000/graphql'));
