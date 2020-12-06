# Chapter 8 - Federation services

This example demonstrates the integration of [Apollo Federation services](https://www.apollographql.com/docs/federation/implementing-services/) into a stitched schema, as described in [Federation services documentation](https://www.graphql-tools.com/docs/stitch-type-merging#federation-services).

As you get the hang of Schema Stitching, you may realize just how complex Federation services are for what they do. The `buildFederatedSchema` method from the `@apollo/federation` package creates a fairly nuanced GraphQL resource that does not guarentee itself to be independently consistent or valid, but plugs seamlessly into a greater automation package. By comparison, stitching encourages services to be independently valid and self-contained GraphQL resources, which makes them quite primitive and durable. While federation automates service bindings at the cost of tightly-coupled complexity, stitching sticks to loosely-coupled bindings at the cost of manual configuration. The merits of each strategy are likely a deciding factor for developers selecting a platform.

Stitching is a library used to build a framework like Federation. It is a more generic tool, and works better without the opinionated complexity added by `buildFederatedSchema`. However, when integrating with preexisting servers or in the process of a migration, nothing says you can't incorporate your existing federation resources into a stitched gateway.

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

Ever wonder what Federation is doing under the hood? Visit the [products service](http://localhost:4001/graphql) and check out some `User` objects:

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

A Federation service automatically builds an `_entities` query that recieves typed keys (i.e.: objects with a `__typename`), and returns abstract `_Entity` objects that may assume the shape of any type in the service. [Apollo Gateway](https://www.npmjs.com/package/@apollo/gateway) then automates the exchange of typed keys for typed results, all going through the dedicated protocol in each subservice. Schema Stitching can also integrate with this `_entities` query by sending it properly formatted keys.

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
        acceptsNewReviews
      }
    }
  }
}
```

The stitched gateway has loaded all federation SDLs, adapted their directives into stitching-native configuration, and now integrates them just like any other GraphQL service with types merged using their `_entities` query.

### Adapting Federation services

Federation and Stitching use fundamentally similar patterns to combine underlying subservices (in fact, both tools have shared origins in [Apollo Stitching](https://www.apollographql.com/docs/federation/migrating-from-stitching/)). However, their specific implementations have an important differentiator:

- **Apollo Federation uses a _centralized_ approach**, where all types have a single "origin" service (this origin is where the unextended type definition is). Querying for a type always starts from its origin and builds out to its extensions.
- **Stitching uses a _decentralized_ approach**, where any service may originate any type. Regardless of where a type originates, its original representation may be filled in with missing details from any service.

The practical implication of how each tool handles origins informs how a federation service gets translated into a stitched subschema:

- All types with a `@key` directive become merged types; the key fields go into `selectionSet`.
- All fields with a `@requires` directive are made into computed fields.
- All fields with an `@external` directive are removed _unless they are part of the `@key`_. Stitching expects schemas to only publish fields that they actually have data for. This is considerably more intuitive than the Federation approach, where services may be responsible for data that they don't have.
- With the indirection of `@external` fields eliminated, the `@provides` directive is no longer necessary. Stitching's query planner can automate the optimial selection of as many fields as possible from as few services as possible.
