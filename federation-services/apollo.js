const { ApolloServer } = require('apollo-server');
const { ApolloGateway } = require('@apollo/gateway');
const waitOn = require('wait-on');

const gateway = new ApolloGateway({
  serviceList: [
    { name: 'products', url: 'http://localhost:4001/graphql' },
    { name: 'reviews', url: 'http://localhost:4002/graphql' },
    { name: 'users', url: 'http://localhost:4003/graphql' },
  ],
});

waitOn({ resources: [4001, 4002, 4003].map(p => `tcp:${p}`) }, async () => {
  const server = new ApolloServer({ gateway, subscriptions: false });

  server.listen(4000).then(({ url }) => {
    console.log(`🚀 Server ready at ${url}`);
  });
});
