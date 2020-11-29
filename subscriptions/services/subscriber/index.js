const http = require('http');
const ws = require('ws');
const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const { execute, subscribe } = require('graphql');
const { useServer } = require('graphql-ws/lib/use/ws');
const { makeExecutableSchema } = require('@graphql-tools/schema');

const { PubSub } = require('apollo-server');
const pubsub = new PubSub();

const POST_ADDED = 'POST_ADDED';
const posts = [];

const schema = makeExecutableSchema({
  typeDefs: `
    type Subscription {
      postAdded: Post
    }
    type Query {
      posts: [Post]
    }
    type Mutation {
      addPost(author: String, comment: String): Post
    }
    type Post {
      author: String
      comment: String
    }
  `,
  resolvers: {
    Subscription: {
      postAdded: {
        // Additional event labels can be passed to asyncIterator creation
        subscribe: () => pubsub.asyncIterator([POST_ADDED]),
      },
    },
    Query: {
      posts(root, args, context) {
        return posts;
      },
    },
    Mutation: {
      addPost(root, args, context) {
        console.log(args)
        posts.push(args);
        pubsub.publish(POST_ADDED, { postAdded: args });
        return args;
      },
    },
  },
});

const app = express();

app.use('/graphql', graphqlHTTP({ schema, graphiql: true }));

const server = http.createServer(app);
const wsServer = new ws.Server({ server, path: '/graphql' });

server.listen(3000, () => {
  useServer({ schema, execute, subscribe }, wsServer);
  console.info('Listening on http://localhost:3000/graphql');
});