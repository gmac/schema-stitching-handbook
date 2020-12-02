const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const { stitchSchemas } = require('@graphql-tools/stitch');

const productsSchema = require('./services/products/schema');
const storefrontsSchema = require('./services/storefronts/schema');

function makeGatewaySchema() {
  // For simplicity, all services run locally in this example.
  // Any of these services could easily be turned into a remote server (see Example 1).
  return stitchSchemas({
    subschemas: [
      {
        schema: productsSchema,
        batch: true,
        merge: {
          Product: {
            selectionSet: '{ id }',
            fieldName: 'products',
            key: ({ id }) => id,
            argsFromKeys: (ids) => ({ ids }),
          }
        }
      },
      {
        schema: storefrontsSchema,
        batch: true
      },
    ]
  });
}

const app = express();
app.use('/graphql', graphqlHTTP({ schema: makeGatewaySchema(), graphiql: true }));
app.listen(4000, () => console.log('gateway running at http://localhost:4000/graphql'));
