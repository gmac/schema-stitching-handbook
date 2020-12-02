const http = require('http');
const ws = require('ws');
const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const { useServer } = require('graphql-ws/lib/use/ws');
const { execute, subscribe } = require('graphql');
const schema = require('./schema');

const app = express();
app.use('/graphql', graphqlHTTP({ schema, graphiql: true }));

// builds a websocket server
// see https://github.com/enisdenjo/graphql-ws#express
const server = http.createServer(app);
const wsServer = new ws.Server({ server, path: '/graphql' });

server.listen(4001, () => {
  useServer({ schema, execute, subscribe }, wsServer);
  console.info('posts running at http://localhost:4001/graphql');
});
