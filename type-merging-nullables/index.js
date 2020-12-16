const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const { stitchSchemas } = require('@graphql-tools/stitch');

const productsSchema = require('./services/products/schema');
const reviewsSchema = require('./services/reviews/schema');
const usersSchema = require('./services/users/schema');

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
            selectionSet: '{ upc }',
            fieldName: 'products',
            key: ({ upc }) => upc,
            argsFromKeys: (upcs) => ({ upcs }),
          },
        },
      },
      {
        schema: reviewsSchema,
        batch: true,
        merge: {
          Product: {
            selectionSet: '{ upc }',
            fieldName: '_products',
            key: ({ upc }) => upc,
            argsFromKeys: (upcs) => ({ upcs }),
          },
          User: {
            selectionSet: '{ id }',
            fieldName: '_users',
            key: ({ id }) => id,
            argsFromKeys: (ids) => ({ ids }),
          },
        },
      },
      {
        schema: usersSchema,
        batch: true,
        merge: {
          User: {
            selectionSet: '{ id }',
            fieldName: 'users',
            key: ({ id }) => id,
            argsFromKeys: (ids) => ({ ids }),
          },
        },
      },
    ]
  });
}

const app = express();
app.use('/graphql', graphqlHTTP({ schema: makeGatewaySchema(), graphiql: true }));
app.listen(4000, () => console.log('gateway running at http://localhost:4000/graphql'));
