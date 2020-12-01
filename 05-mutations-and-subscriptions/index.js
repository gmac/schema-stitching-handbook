const { ApolloServer } = require('apollo-server');
const { introspectSchema } = require('@graphql-tools/wrap');
const { stitchSchemas } = require('@graphql-tools/stitch');

const makeRemoteExecutor = require('./lib/make_remote_executor');
const makeRemoteSubscriber = require('./lib/make_remote_subscriber');

async function makeGatewaySchema() {
  // build executor and subscriber functions
  // for communicating with remote services
  const postsExec = makeRemoteExecutor('http://localhost:4001/graphql');
  const postsSubscriber = makeRemoteSubscriber('ws://localhost:4001/graphql');
  const usersExec = makeRemoteExecutor('http://localhost:4002/graphql');

  return stitchSchemas({
    subschemas: [
      {
        schema: await introspectSchema(postsExec),
        // executor handles query and mutation requests over HTTP
        executor: postsExec,
        // subscriber returns an AsyncIterator that proxies remote sockets
        subscriber: postsSubscriber,
      },
      {
        schema: await introspectSchema(usersExec),
        executor: usersExec,
        merge: {
          // merge type configuration, see third example
          User: {
            selectionSet: '{ id }',
            fieldName: 'users',
            key: ({ id }) => id,
            argsFromKeys: (ids) => ({ ids }),
          }
        }
      },
    ]
  });
}

makeGatewaySchema().then(schema => {
  const server = new ApolloServer({ schema, playground: true });
  server.listen(4000).then(() => console.log(`gateway running at http://localhost:4000/graphql`));
});
