const { PubSub } = require("apollo-server");
const { makeExecutableSchema } = require("@graphql-tools/schema");
const NotFoundError = require("../../lib/not_found_error");
const readFileSync = require("../../lib/read_file_sync");
const typeDefs = readFileSync(__dirname, "schema.graphql");

const NEW_PRODUCT = "NEW_PRODUCT";
const pubsub = new PubSub();
const products = [
  { upc: "1", name: "Cookbook", price: 15.99 },
  { upc: "2", name: "Toothbrush", price: 3.99 },
];

module.exports = makeExecutableSchema({
  typeDefs,
  resolvers: {
    Query: {
      product: (root, { upc }) =>
        products.find((p) => p.upc === upc) || new NotFoundError(),
    },
    Mutation: {
      createProduct: (root, { name, price, upc }) => {
        const newProduct = { name, price, upc };
        products.push(newProduct);
        pubsub.publish(NEW_PRODUCT, { newProduct });
        return newProduct;
      },
    },
    Subscription: {
      newProduct: {
        subscribe: () => pubsub.asyncIterator(NEW_PRODUCT),
      },
    },
  },
});
