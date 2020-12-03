const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const gatewayLoader = require('./services/gateway/schema');

gatewayLoader.load().then(() => {
  const app = express();
  app.use('/graphql', graphqlHTTP(() => ({ schema: gatewayLoader.schema, graphiql: true })));
  app.listen(4000, () => console.log('gateway running http://localhost:4000/graphql'));
  gatewayLoader.autoRefresh();
});
