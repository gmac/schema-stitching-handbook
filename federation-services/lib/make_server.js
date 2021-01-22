const express = require('express');
const { graphqlHTTP } = require('express-graphql');

module.exports = function makeServer(schema, name, port=4000) {
  const app = express();
  app.use('/graphql', graphqlHTTP((request, response, graphQLParams) => {
    console.log(name, graphQLParams.query.replace(/[\n\s]+/g, ' '), JSON.stringify(graphQLParams.variables));
    return { schema, graphiql: true };
  }));
  app.listen(port, () => console.log(`${name} running at http://localhost:${port}/graphql`));
};
