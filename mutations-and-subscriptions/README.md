# Chapter 2 – Mutations &amp; subscriptions

This example explores stitching mutation and subscription services into a combined gateway schema, as discussed in [stitching remote schemas](https://www.graphql-tools.com/docs/stitch-combining-schemas#stitching-remote-schemas) documentation.

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

This example uses [Apollo Server](https://github.com/apollographql/apollo-server) to serve the stitched gateway due to the GraphQL Playground UI's subscription features. You're welcome to serve your combined gateway schema from a simpler server such as this example's Posts service.

## Summary

This example incorporates queries, mutations, subscriptions, and previews how a type can be merged across services.

### Queries

Run the following query to see all posts that have been created; the results will be empty to start with:

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

All gateway query operations proxy a remote service using the `executor` function in subschema config.

### Mutations

Mutations are virtually identical to queries, but with the expressed intent of modifying data on a remote server. They use a different GraphQL operation name ("mutation") to assure that they're not intermixed with queries. Try opening a new tab in the GraphQL Playground UI and running the following mutation:

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

Rerunning the query above, you'll see there are now posts. This mutation creates in-memory records in the Posts service (the records will be reset each time the server restarts). The results of a mutation are resolved just like any other typed object, so may resolve all of the same data as a query&mdash;including a randomly assigned a `User` association that comes from the Users service (the process for which is discussed in [chapter three](#)).

Like queries, all gateway mutation operations proxy a remote service using the `executor` function in subschema config.

### Subscriptions

Subscriptions pull live GraphQL updates over a websocket connection. Try opening another tab in the GraphQL Playground UI and running the following subscription:

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

Nothing happens aside from a load spinner appearing&mdash;however you have an open socket connection that is waiting to recieve data. Now try running the above mutation a few more times and then check back in on your subscription. The subscription will receive a live push of data each time a mutation publishes an update. Again, the results of a subscription are resolved just like any other typed object, so may resolve all of the same data as a query&mdash;including data merged from across services.

Gateway subscription operations proxy a remote service using the `subscriber` function in subschema config.

### Subscription setup

To support stitched subscriptions, you need two things:

1. The gateway server and all subscription-enabled remote servers require a configured WebSocket server. See the various server recipes in [graphql-ws](https://github.com/enisdenjo/graphql-ws#recipes). In this example, the gateway uses `ApolloServer` which is configured out of the box.

2. The gateway schema must include a `subscriber` function for subscription-enabled subschemas. This function must return an [AsyncIterator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/asyncIterator), for which there is also a [graphql-ws recipe](https://github.com/enisdenjo/graphql-ws#async-iterator) used in this example.

### Concerning subscription packages

You'll see lots of existing documentation and examples written around graphql-transport-ws, which is an older package superseded by graphql-ws. Somewhat confusingly, these packages are NOT interoperable, so a server built using one package will not talk to a client of the other package. This is particularly confusing now (at the time of writing) because most major GraphQL UIs (playground, graphiql) have not yet been updated to talk to a graphql-ws server. This example technically uses both. The gateway -> subservice creates a complete link using graphql-ws, while the UI -> gateway link is setup automatically using graphql-transport-ws on both the client and server. These two separate links are joined through an AsyncInterable object, which constitutes a generic interface for the two links to interact. 
