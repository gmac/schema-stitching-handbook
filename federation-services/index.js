const { stitchSchemas } = require('@graphql-tools/stitch');
const { introspectSchema } = require('@graphql-tools/wrap');
const makeServer = require('./lib/make_server');
const makeRemoteExecutor = require('./lib/make_remote_executor');
const makeFederationSubchema = require('./lib/fetch_federation_subschema');

async function makeGatewaySchema() {
  return stitchSchemas({
    subschemas: await Promise.all([
      makeFederationSubchema(makeRemoteExecutor('http://localhost:4001/graphql', 'products')),
      makeFederationSubchema(makeRemoteExecutor('http://localhost:4002/graphql', 'reviews')),
      makeFederationSubchema(makeRemoteExecutor('http://localhost:4003/graphql', 'users')),
    ])
  });
}

makeGatewaySchema().then(schema => makeServer(schema, 'gateway', 4000));
