const express = require('express');
const { graphqlHTTP } = require('express-graphql');

module.exports = function makeRemoteServer(schema, name, port=4000) {
  const app = express();
  app.use('/graphql', graphqlHTTP({ schema, graphiql: true }));
  app.listen(port, () => console.log(`${name} running at http://localhost:${port}/graphql`));
};
