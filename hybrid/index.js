const waitOn = require("wait-on");
const { ApolloServer } = require("apollo-server");
const { introspectSchema, wrapSchema } = require("@graphql-tools/wrap");
const { stitchSchemas } = require("@graphql-tools/stitch");
const makeHybridExecutor = require("./lib/make_hybrid_executor");
const schema = require("./services/local/schema");

async function makeGatewaySchema() {
  const executor = makeHybridExecutor("http://localhost:4001/graphql");

  const remoteSchemaWithHybridExecutor = wrapSchema({
    executor,
    schema: await introspectSchema(executor),
  });

  const localSchema = {
    schema,
  };

  return stitchSchemas({
    subschemas: [remoteSchemaWithHybridExecutor, localSchema],
  });
}

waitOn({ resources: ["tcp:4001"] }, async () => {
  const schema = await makeGatewaySchema();
  const server = new ApolloServer({
    schema,
    context: () => ({
      authHeader: "12345",
    }),
  }); // uses Apollo Server for its subscription UI features
  server
    .listen(4000)
    .then(() =>
      console.log(`gateway running at http://localhost:4000/graphql`)
    );
});
