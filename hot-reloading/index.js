const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const makeGatewaySchemaLoader = require('./services/gateway/schema');

const schemaLoader = makeGatewaySchemaLoader([
  'http://localhost:4001/graphql',
  'http://localhost:4002/graphql',
]);

schemaLoader.load().then((schema) => {
  const app = express();
  app.use('/graphql', graphqlHTTP(() => ({ schema, graphiql: true })));
  app.listen(4000, () => console.log('gateway running http://localhost:4000/graphql'));
  schemaLoader.autoRefresh();
});