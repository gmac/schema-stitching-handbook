const { PubSub } = require('graphql-subscriptions');
const { makeExecutableSchema } = require('@graphql-tools/schema');

const NEW_POST = 'NEW_POST';
const pubsub = new PubSub();
const posts = [];

module.exports = makeExecutableSchema({
  typeDefs: `
    type Post {
      id: ID!
      message: String!
    }
    type Query {
      posts: [Post]!
    }
    type Mutation {
      createPost(message: String!, userId: ID): Post!
    }
    type Subscription {
      newPost: Post!
    }
  `,
  resolvers: {
    Query: {
      posts: () => posts,
    },
    Mutation: {
      createPost: (root, { message, userId }) => {
        const newPost = {
          id: posts.length + 1,
          message,
          userId
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
