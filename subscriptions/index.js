const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const { introspectSchema } = require('@graphql-tools/wrap');
const { stitchSchemas } = require('@graphql-tools/stitch');
const { buildSchema } = require('graphql');

const makeRemoteExecutor = require('./lib/make_remote_executor');
const makeRemoteSubscriber = require('./lib/make_remote_subscriber');

async function makeGatewaySchema() {
  const postsExec = makeRemoteExecutor('http://localhost:4001/graphql');
  const postsSubscriber = makeRemoteSubscriber('ws://localhost:4001/graphql');

  return stitchSchemas({
    subschemas: [
      {
        schema: await introspectSchema(postsExec),
        executor: postsExec,
        subscriber: postsSubscriber,
      }
    ]
  });
}

makeGatewaySchema().then(schema => {
  const app = express();
  app.use('/graphql', graphqlHTTP({ schema, graphiql: true }));
  app.listen(4000);
  console.log('gateway running on port 4000');
});



// DEBUGGING CLIENT...
// assure the subscriptions are actually working:
(async () => {
  const ws = require('ws');
  const { createClient } = require('graphql-ws');
  const client = createClient({ url: 'ws://localhost:4001/graphql', webSocketImpl: ws });

  await new Promise((resolve, reject) => {
    client.subscribe({
      query: 'subscription { newPost { message } }',
    }, {
      next: (data) => { console.log('newPost:', data) },
      error: reject,
      complete: resolve,
    });
  });
})();
