# Chapter 8 - Federation services

This example demonstrates the integration of [Apollo Federation services](https://www.apollographql.com/docs/federation/implementing-services/) into a stitched schema, as described in [Federation services documentation](https://www.graphql-tools.com/docs/stitch-type-merging#federation-services).

As you get the hang of Schema Stitching, you may realize just how complex Federation services are for what they do. The `buildFederatedSchema` method from the `@apollo/federation` package creates a fairly nuanced GraphQL resource that does not guarentee itself to be independently consistent or valid, but plugs seamlessly into a greater automation package. By comparison, Schema Stitching encourages services to be independently valid and self-contained GraphQL resources, which makes them quite primitive and durable. While Apollo Federation automates service bindings at the cost of tightly-coupled complexity, Schema Stitching sticks to bare-metal at the cost of manual configuration. The merits of each strategy is a likely delineator for most developers. In a very real sense, schema stitching is a library that could be used to build the Federation framework.

In general, stitching works better without the overhead complexity added by `buildFederatedSchema`. However, if you're integrating with preexisting servers or in the process of a migration, nothing says you can't incorporate your existing resources into a stitched gateway.

**This example demonstrates:**

- Integrating Apollo Federation services into a stitched schema.
- Fetching and parsing Federation SDLs.

## Setup

```shell
cd federation-services

yarn install
yarn start-services
```

Then in a new terminal tab:

```shell
yarn start-gateway
```

The following services are available for interactive queries:

- **Stitched gateway:** http://localhost:4000/graphql
- _Products subservice_: http://localhost:4001/graphql
- _Reviews subservice_: http://localhost:4002/graphql
- _Users subservice_: http://localhost:4003/graphql

This example is based on the [Federation intro example](https://www.apollographql.com/docs/federation/#concern-based-separation).

## Summary

Ever wonder what Federation is doing under the hood? Visit the [products service](http://localhost:4001/graphql) and check out some User objects:

```graphql
query {
  _entities(representations: [
    { __typename: "User", id: "1" },
    { __typename: "User", id: "2" },
    { __typename: "User", id: "3" }
  ]) {
    ...on User {
      id
      recentPurchases {
        upc
        name
        price
      }
    }
  }
}
```

Federation services automatically setup an `_entities` query that recieves typed keys (i.e.: objects with a `__typename`), and returns abstract `_Entity` objects that may assume the shape of any type in the service. Apollo Gateway then automates the construction of typed keys and the collection of typed results, all going through a dedicated protocol available in each service. Schema stitching can use this same `_entities` query simply by sending it properly formatted keys.

Now [go to the gateway](http://localhost:4001/graphql) and check out the stitched results:

```graphql
query {
  user(id: "1") {
    username
    recentPurchases {
      upc
      name
    }
    reviews {
      body
      author {
        id
        username
      }
      product {
        upc
        name
      }
    }
  }
}
```
