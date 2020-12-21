const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const { buildSubschemaConfigs, buildGatewaySchema } = require('./lib/schema_builder');

const schema = buildGatewaySchema(buildSubschemaConfigs());
const app = express();
app.use('/graphql', graphqlHTTP({ schema, graphiql: true }));
app.listen(4000, () => console.log('gateway running at http://localhost:4000/graphql'));
