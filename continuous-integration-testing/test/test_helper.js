const { graphql } = require('graphql');
const { addMocksToSchema } = require('@graphql-tools/mock');
const { printSchemaWithDirectives } = require('@graphql-tools/utils');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { stitchingDirectives } = require('@graphql-tools/stitching-directives');
const { stitchingDirectivesValidator } = stitchingDirectives();
const { buildSubschemaConfigs, buildGatewaySchema } = require('../lib/schema_builder');

// Setup a mapping of test fixtures by service name
const fixturesByName = {
  products: require('./mock_services/products'),
  reviews: require('./mock_services/reviews'),
  users: require('./mock_services/users'),
};

// Get the actual subschemas built for the production app:
const subschemaConfigs = buildSubschemaConfigs();

// Reconfigure the subschema configurations for testing...
// makes all subschemas locally-executable,
// and sets them up with mocked fixture data to test with.
Object.entries(subschemaConfigs).forEach(([name, subschemaConfig]) => {
  const fixtures = fixturesByName[name] || {};

  // build all of the base schemas into locally-executable test schemas
  // apply mock service resolvers to give them some simple record fixtures
  const schema = makeExecutableSchema({
    schemaTransforms: [stitchingDirectivesValidator],
    typeDefs: printSchemaWithDirectives(subschemaConfig.schema),
    resolvers: fixtures.resolvers,
  });

  // apply mocks to fill in missing values
  // anything without a resolver or fixture data
  // gets filled in with a predictable service-specific scalar
  subschemaConfig.schema = addMocksToSchema({
    preserveResolvers: true,
    schema,
    mocks: {
      String: () => `${name}-value`,
      ...(fixtures.mocks || {}),
    }
  });

  // remove all executors (run everything as a locally-executable schema)
  delete subschemaConfig.executor;
});

// Run the gateway builder using the mocked subservices
// this gives the complete stitched gateway talking to mocked services.
const mockedGateway = buildGatewaySchema(subschemaConfigs);

function queryMockedGateway(query, variables={}) {
  return graphql(mockedGateway, query, {}, variables);
}

module.exports = {
  queryMockedGateway
};
