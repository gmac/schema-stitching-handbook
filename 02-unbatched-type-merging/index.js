const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const { stitchSchemas } = require('@graphql-tools/stitch');

const manufacturersSchema = require('./services/manufacturers/schema');
const productsSchema = require('./services/products/schema');
const storefrontsSchema = require('./services/storefronts/schema');

function makeGatewaySchema() {
  // For simplicity, all services run locally in this example.
  // Any of these services could easily be turned into a remote server (see Example 1).
  return stitchSchemas({
    subschemas: [
      {
        schema: manufacturersSchema,
        merge: {
          // This schema provides one unique field of data for the Manufacturer type (`name`).
          // The gateway needs a query configured so it can fetch this data...
          // this config delegates to `manufacturer(id: $id)`.
          Manufacturer: {
            selectionSet: '{ id }',
            fieldName: 'manufacturer',
            args: ({ id }) => ({ id }),
          }
        }
      },
      {
        schema: productsSchema,
        merge: {
          Manufacturer: {
            // This schema also provides a unique field of data for the Manufacturer type (`products`).
            // Therefore, the gateway needs another query configured so it can also fetch this version of the type.
            // This is a _multi-directional_ merge because multiple services contribute unique Manufacturer data.
            // This config delegates to `_manufacturer(id: $id)`.
            selectionSet: '{ id }',
            fieldName: '_manufacturer',
            args: ({ id }) => ({ id }),
          },
          Product: {
            // This service provides _all_ unique fields for the Product type.
            // Again, there's unique data here so the gateway needs a query configured to fetch the type.
            // This config delegates to `product(upc: $upc)`.
            selectionSet: '{ upc }',
            fieldName: 'product',
            args: ({ upc }) => ({ upc }),
          }
        }
      },
      {
        schema: storefrontsSchema,
        // While the Storefronts service _also_ defines the Product type,
        // its local Product has no unique data. In effect, the local type
        // is just a foreign key (`Product.upc`) that maps to the Products schema.
        // That means an inbound request will never be required to fetch a Product
        // from the Storefronts service, so no query config is needed.
        // This makes the Product type a one-way merge with the Products service.
      },
    ]
  });
}

const app = express();
app.use('/graphql', graphqlHTTP({ schema: makeGatewaySchema(), graphiql: true }));
app.listen(4000);
console.log('gateway running on port 4000');
