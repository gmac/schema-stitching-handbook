const { PubSub } = require('apollo-server');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const readFileSync = require('../../lib/read_file_sync');
const typeDefs = readFileSync(__dirname, 'schema.graphql');

const NEW_POST = 'NEW_POST';
const pubsub = new PubSub();
const posts = [];

module.exports = makeExecutableSchema({
  typeDefs,
  resolvers: {
    Post: {
      user: (post) => ({ id: post.userId }),
    },
    Query: {
      posts: () => posts,
    },
    Mutation: {
      createPost: (root, { message }) => {
        const newPost = {
          id: posts.length + 1,
          userId: String(Math.round(Math.random() * 2) + 1),
          message,
        };

        posts.push(newPost);
        pubsub.publish(NEW_POST, { newPost });
        return newPost;
      }
    },
    Subscription: {
      newPost: {
        subscribe: () => pubsub.asyncIterator(NEW_POST)
      }
    },
  }
});
