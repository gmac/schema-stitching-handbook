# Chapter 10 – Hot schema reloading

This example demonstrates the gateway server refreshing the schema in response to "push" input of service changes via mutations as well as "pull" input of service health via subschema SDL polling.

**This example demonstrates:**

- Hot reload of the combined gateway schema (no server restart).
- Polling for remote subschema changes.
- Mutations for adding/removing remote subservices.
- Handling subservice request timeouts.

## Setup

```shell
cd 06-hot-reloading-with-directives.

yarn install
start-service-accounts
```

Then, in a separate terminal tab:

```shell
start-service-inventory
```

In a third terminal tab:

```shell
start-service-products
```

In a fourth terminal tab:

```shell
start-service-reviews
```

And, finally, in a fifth terminal tab:

```shell
yarn start-gateway
```

The following services are available for interactive queries:

- **Stitched gateway:** http://localhost:4000/graphql
- _Accounts subservice_: http://localhost:4001/graphql
- _Inventory subservice_: http://localhost:4002/graphql
- _Products subservice_: http://localhost:4003/graphql
- _Reviews subservice_: http://localhost:4004/graphql

## Summary

Visit the [stitched gateway](http://localhost:4000/graphql) and try running the following query:

```graphql
query {
  allEndpoints {
    url
  }
}
```

Note that the available types and root fields reflect all four of the services returned.

Then, try the following mutation:

```graphql
mutation {
  removeEndpoint(url: "http://localhost:4004/graphql") {
    success
  }
}
```

Reload the [stitched gateway](http://localhost:4000/graphql) and see how the available types and root fields automatically adjust after the Reviews service has been removed from the gateway.

Then, try the following mutation:

```graphql
mutation {
  addEndpoint(url: "http://localhost:4004/graphql") {
    success
  }
}
```

Reload the [stitched gateway](http://localhost:4000/graphql) and see how the available types and root fields have been restored.

Finally, try stopping the Review service by closing its terminal. Reload the [stitched gateway](http://localhost:4000/graphql) to once again see how the available types and root fields adjust automatically.