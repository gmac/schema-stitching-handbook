# Example 6 – Using stitching directives

This example demonstrates the use of stitching directives to specify type merging configuration. The `@graphql-tools/stitching-directives` package provides importable directives that can be used to annotate types and fields within subschemas, a validator to ensure the directives are used appropriately, and a configuration transformer that can be used on the gateway to convert the subschema directives into explicit configuration setting.

The service setup in this example is based on the [official demonstration repository](https://github.com/apollographql/federation-demo) for
[Apollo Federation](https://www.apollographql.com/docs/federation/).

**This example demonstrates:**

- Adding remote schemas, with typedefs + custom directives exposed on each subschema via a custom root field.
- Use of the @key, @computed and @merge directives from `@graphql-tools/stitching-directives` to specify subschema merge configuration.
- Use of a custom executor that times out a request after a pre-specified limit.
- Addition of custom queries/mutations on the gateway for listing/modifying the configured services.
- Hot reloading of the gateway schema based on the available services, responsive to "push" input of service changes via mutations with "pull" input of service health via polling the SDL.  

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