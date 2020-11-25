const { makeExecutableSchema } = require('@graphql-tools/schema');

module.exports = makeExecutableSchema({
  typeDefs: `
    type Query {
      errorCodes: [String!]!
    }
  `,
  resolvers: {
    Query: {
      errorCodes: () => [
        'NOT_FOUND',
        'GRAPHQL_PARSE_FAILED',
        'GRAPHQL_VALIDATION_FAILED',
      ]
    }
  }
});
