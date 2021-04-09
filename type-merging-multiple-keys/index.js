const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const { stitchSchemas } = require('@graphql-tools/stitch');
const catalogSchema = require('./services/catalog/schema');
const vendorsSchema = require('./services/vendors/schema');
const reviewsSchema = require('./services/reviews/schema');

function makeGatewaySchema() {
  return stitchSchemas({
    subschemas: [
      {
        schema: catalogSchema,
        merge: {
          Product: {
            selectionSet: '{ upc }',
            fieldName: 'productsByUpc',
            key: ({ upc }) => upc,
            argsFromKeys: (upcs) => ({ upcs }),
          }
        }
      },
      {
        schema: vendorsSchema,
        batch: true, // << enable batching to consolidate requests!
        merge: {
          Product: {
            entryPoints: [{
              selectionSet: '{ upc }',
              fieldName: 'productsByKey',
              key: ({ upc }) => ({ upc }),
              argsFromKeys: (keys) => ({ keys }),
            }, {
              selectionSet: '{ id }',
              fieldName: 'productsByKey',
              key: ({ id }) => ({ id }),
              argsFromKeys: (keys) => ({ keys }),
            }],
          }
        }
      },
      {
        schema: reviewsSchema,
        merge: {
          Product: {
            selectionSet: '{ id }',
            fieldName: 'productsById',
            key: ({ id }) => id,
            argsFromKeys: (ids) => ({ ids }),
          }
        }
      }
    ]
  });
}

const app = express();
app.use('/graphql', graphqlHTTP({ schema: makeGatewaySchema(), graphiql: true }));
app.listen(4000, () => console.log('gateway running at http://localhost:4000/graphql'));
