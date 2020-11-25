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
        batch: true,
        merge: {
          // This schema provides one unique field of data for the `Manufacturer` type (`name`).
          // The gateway needs a query configured so it can fetch this data...
          // this config delegates to `manufacturers(ids: $ids)`.
          Manufacturer: {
            selectionSet: '{ id }',
            fieldName: 'manufacturers',
            key: ({ id }) => id,
            argsFromKeys: (ids) => ({ ids }),
          }
        }
      },
      {
        schema: productsSchema,
        batch: true,
        merge: {
          Manufacturer: {
            // This schema also provides a unique field of data for the `Manufacturer` type (`products`).
            // Therefore, the gateway needs another query configured so it can also fetch this version of the type.
            // This is a _multi-directional_ merge because multiple services contribute unique Manufacturer data.
            // This config delegates to `_manufacturers(ids: $ids)`.
            selectionSet: '{ id }',
            fieldName: '_manufacturers',
            key: ({ id }) => id,
            argsFromKeys: (ids) => ({ ids }),
          },
          Product: {
            // This service provides _all_ unique fields for the `Product` type.
            // Again, there's unique data here so the gateway needs a query configured to fetch it.
            // This config delegates to `products(upcs: $upcs)`.
            selectionSet: '{ upc }',
            fieldName: 'products',
            key: ({ upc }) => upc,
            argsFromKeys: (upcs) => ({ upcs }),
          }
        }
      },
      {
        schema: storefrontsSchema,
        batch: true,
        // While the Storefronts service also defines a `Product` type,
        // it contains no unique data. The local `Product` type is really just
        // a foreign key (`Product.upc`) that maps to the Products schema.
        // That means the gateway will never need to perform an inbound request
        // to fetch this version of a `Product`, so no merge query config is needed.
      },
    ]
  });
}

const app = express();
app.use('/graphql', graphqlHTTP({ schema: makeGatewaySchema(), graphiql: true }));
app.listen(4000);
console.log('gateway running on port 4000');
