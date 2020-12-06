const { stitchSchemas } = require('@graphql-tools/stitch');
const makeServer = require('./lib/make_server');
const makeRemoteExecutor = require('./lib/make_remote_executor');
const makeFederationSubchema = require('./lib/fetch_federation_subschema');

async function makeGatewaySchema() {
  return stitchSchemas({
    subschemas: await Promise.all([
      makeFederationSubchema(makeRemoteExecutor('http://localhost:4001/graphql')),
      makeFederationSubchema(makeRemoteExecutor('http://localhost:4002/graphql')),
      makeFederationSubchema(makeRemoteExecutor('http://localhost:4003/graphql')),
    ])
  });
}

makeGatewaySchema().then(schema => makeServer(schema, 'gateway', 4000));
