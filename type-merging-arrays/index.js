const waitOn = require('wait-on');
const { stitchSchemas } = require('@graphql-tools/stitch');
const { introspectSchema } = require('@graphql-tools/wrap');
const makeServer = require('./lib/make_server');
const makeRemoteExecutor = require('./lib/make_remote_executor');

async function makeGatewaySchema() {
  const manufacturersExec = makeRemoteExecutor('http://localhost:4001/graphql');
  const productsExec = makeRemoteExecutor('http://localhost:4002/graphql');
  const storefrontsExec = makeRemoteExecutor('http://localhost:4003/graphql');

  return stitchSchemas({
    subschemas: [
      {
        schema: await introspectSchema(manufacturersExec),
        executor: manufacturersExec,
        batch: true,
        merge: {
          // This schema provides one unique field of data for the `Manufacturer` type (`name`).
          // The gateway needs a query configured so it can fetch this data...
          // this config delegates to `manufacturers(ids: $ids)`.
          Manufacturer: {
            selectionSet: '{ id }',
            fieldName: 'manufacturers',
            key: ({ id }) => id, // pluck a key from each record in the array
            argsFromKeys: (ids) => ({ ids }), // format all plucked keys into query args
          }
        }
      },
      {
        schema: await introspectSchema(productsExec),
        executor: makeRemoteExecutor('http://localhost:4002/graphql', { log: true }),
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
            // Compare array-batched logging to the single-record equivalent:
            // fieldName: 'product',
            // args: ({ upc }) => ({ upc }),
          }
        }
      },
      {
        schema: await introspectSchema(storefrontsExec),
        executor: storefrontsExec,
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

waitOn({ resources: ['tcp:4001', 'tcp:4002', 'tcp:4003'] }, async () => {
  makeServer(await makeGatewaySchema(), 'gateway', 4000);
});
