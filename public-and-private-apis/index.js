const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const { stitchSchemas } = require('@graphql-tools/stitch');
const { stitchingDirectives } = require('@graphql-tools/stitching-directives');
const { stitchingDirectivesTransformer } = stitchingDirectives();
const { filterSchema, pruneSchema } = require('@graphql-tools/utils');

const accountsSchema = require('./services/accounts/schema');
const productsSchema = require('./services/products/schema');
const reviewsSchema = require('./services/reviews/schema');

function makeGatewaySchema() {
  return stitchSchemas({
    subschemaConfigTransforms: [stitchingDirectivesTransformer],
    subschemas: [
      { schema: reviewsSchema },
      { schema: accountsSchema },
      { schema: productsSchema },
    ]
  });
}

// Build public and private versions of the gateway schema:
// - the private schema has all fields, including internal services.
// - the public schema has all underscored name fields removed.
const privateSchema = makeGatewaySchema();
const publicSchema = pruneSchema(filterSchema({
  schema: privateSchema,
  rootFieldFilter: (type, fieldName) => !fieldName.startsWith('_'),
  fieldFilter: (type, fieldName) => !fieldName.startsWith('_'),
  argumentFilter: (typeName, fieldName, argName) => !argName.startsWith('_'),
}));

// Serve the public and private schema versions at different locations.
// This allows the public to access one API with reduced features,
// while internal services can authenticate with the private API for all features.
const app = express();
app.use('/private/graphql', graphqlHTTP({ schema: privateSchema, graphiql: true }));
app.use('/public/graphql', graphqlHTTP({ schema: publicSchema, graphiql: true }));
app.listen(4000, () => console.log([
  'private gateway running at http://localhost:4000/private/graphql',
  'public gateway running at http://localhost:4000/public/graphql',
].join('\n')));
