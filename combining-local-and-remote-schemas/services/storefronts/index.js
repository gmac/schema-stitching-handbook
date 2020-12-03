const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const schema = require('./schema');

const app = express();
app.use('/graphql', graphqlHTTP({ schema, graphiql: true }));
app.listen(4002, () => console.log('storefronts running at http://localhost:4002/graphql'));