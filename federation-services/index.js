const { stitchSchemas } = require('@graphql-tools/stitch');
const { introspectSchema } = require('@graphql-tools/wrap');
const makeServer = require('./lib/make_server');
const makeRemoteExecutor = require('./lib/make_remote_executor');
const fetchFederationSchema = require('./lib/fetch_federation_schema');

async function makeGatewaySchema() {
  const productsExec = makeRemoteExecutor('http://localhost:4001/graphql');
  const reviewsExec = makeRemoteExecutor('http://localhost:4002/graphql');
  const usersExec = makeRemoteExecutor('http://localhost:4003/graphql');

  // Merge config for integrating types through the Federation "_entities" query:
  // federation and stitching really aren't all that different...
  // where federation sends typed keys to a dedicated automation query,
  // stitching sends primitive keys to the typed queries you've built for humans.
  // It's pretty simple to bridge this paradigm and make stitching build typed keys:

  const productMerger = {
    selectionSet: '{ upc }',
    fieldName: '_entities',
    key: ({ upc }) => ({ __typename: 'Product', upc }),
    argsFromKeys: (representations) => ({ representations }),
  };

  const userMerger = {
    selectionSet: '{ id }',
    fieldName: '_entities',
    key: ({ id }) => ({ __typename: 'User', id }),
    argsFromKeys: (representations) => ({ representations }),
  };

  return stitchSchemas({
    subschemas: [
      // 1. Integrate Federation services through "formal" specification channels:
      // these two subschemas fetch their SDLs through the federation "_service" query,
      // and perform type merging through the federation "_entities" query.
      {
        schema: await fetchFederationSchema(productsExec),
        executor: productsExec,
        batch: true,
        merge: {
          Product: productMerger,
          User: userMerger,
        }
      },
      {
        schema: await fetchFederationSchema(reviewsExec),
        executor: reviewsExec,
        batch: true,
        merge: {
          Product: productMerger,
          User: userMerger,
        }
      },
      // 2. OR... just hack it! It's generally simpler.
      {
        // Introspection is by far the simplest way to get a valid Federation schema, when permitted.
        // The stitched gateway doesn't need (or want) "extends" keywords or the directives,
        // so introspection slurps in all relevant implementation details with none of the baggage.
        schema: await introspectSchema(usersExec),
        executor: usersExec,
        batch: true,
        merge: {
          User: {
            // Nothing says we need to merge using the formal "_entities" query.
            // Schemas generally include simple typed queries intended for humans,
            // and those are equally sufficient for merging.
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

makeGatewaySchema().then(schema => makeServer(schema, 'gateway', 4000));
