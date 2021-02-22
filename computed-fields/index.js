const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const { stitchSchemas } = require('@graphql-tools/stitch');
const { RemoveObjectFieldDeprecations } = require('@graphql-tools/wrap');

const metadataSchema = require('./services/metadata/schema');
const productsSchema = require('./services/products/schema');

function makeGatewaySchema() {
  return stitchSchemas({
    subschemas: [
      {
        schema: metadataSchema,
        transforms: [new RemoveObjectFieldDeprecations('gateway access only')],
        batch: true,
        merge: {
          Product: {
            // selectionSet: '{ upc }', << technically not necessary here!
            fields: {
              category: { selectionSet: '{ categoryId }', computed: true },
              metadata: { selectionSet: '{ metadataIds }', computed: true },
            },
            fieldName: '_products',
            key: ({ categoryId, metadataIds }) => ({ categoryId, metadataIds }),
            argsFromKeys: (keys) => ({ keys }),
          }
        }
      },
      {
        schema: productsSchema,
        batch: true,
      }
    ]
  });
}

const app = express();
app.use('/graphql', graphqlHTTP({ schema: makeGatewaySchema(), graphiql: true }));
app.listen(4000, () => console.log('gateway running at http://localhost:4000/graphql'));
