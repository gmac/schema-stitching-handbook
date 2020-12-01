# Mutations & Subscriptions

This example demonstrates stitching mutation and subscription services into the combined gateway schema, as discussed in [stitching remote schemas](https://www.graphql-tools.com/docs/stitch-combining-schemas#stitching-remote-schemas) documentation.

**This example demonstrates:**

- Adding a remote mutation service.
- Adding a remote subscription service.
- Adding a subscriber proxy.

## Setup

```shell
cd 05-mutations-and-subscriptions

yarn install
yarn start-services
```

Then in a new terminal tab:

```shell
yarn start-gateway
```

The following services are available for interactive queries:

- **Stitched gateway:** http://localhost:4000/graphql
- _Posts subservice_: http://localhost:4001/graphql
- _Users subservice_: http://localhost:4002/graphql

This example uses [Apollo Server](https://github.com/apollographql/apollo-server) to serve the stitched gateway due to its built-in GraphQL subscriptions client. You're welcome to serve your combined gateway schema from a simpler server such as the Posts service in this example.

## Summary

This example incorporates queries, mutations, subscriptions, and a type merged across services.

### Mutations

Mutations are virtually identical to queries, but with the expressed intent of modifying data on a remote server. Their difference in root operation name assures that queries and mutations are not allowed to be mixed. Their technical implementation does not differ from a query though.

Try running the following mutation in the gateway:

```graphql
mutation {
  createPost(message: "hello world") {
    id
    message
    user {
      username
      email
    }
  }
}
```

This mutation originates in the Posts service, and creates records in an in-memory array there (the records will be reset each time the server restarts). Mutation results are resolved just like any other typed object, so may also merge fields from across services. Notice that a new `Post` includes a randomly assigned `User`&mdash;the data for which comes from the Users service.

Each time you run the above mutation, you create a new `Post`. To see all the posts that you've created, you may query them:

```graphql
query {
  posts {
    id
    message
    user {
      username
      email
    }
  }
}
```

### Subscriptions

Now open a new tab in the gateway server's GraphQL IDE, and try running a subscription operation:

```graphql
subscription {
  newPost {
    id
    message
    user {
      id
      username
      email
    }
  }
}
```

Note that nothing happens aside from a load spinner appearing to indicate that the client is awaiting data. You've now opened a socket connection, and are waiting to receive new `Post` records. Switch back to the other GraphQL tab and run the mutation above a few more times. Looking back at your subscriptions panel, you should see that the results of those mutations have been pushed to the subscription results feed.

Again, subscription results are resolved just like any other typed object, so may also merge fields from across services. This pushed subscription data includes data from both the Posts and Users service.
