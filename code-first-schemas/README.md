# Chapter X – Stitching directives with Code-First Schemas

This example demonstrates the use of stitching directives to configure type merging, similar to the prior example, but uses code-first schemas instead of SDL.

The `@graphql-tools/stitching-directives` package provides importable directives definitions that can be used to annotate types and fields within subschemas, a validator to ensure the directives are used appropriately, and a configuration transformer that can be used on the gateway to convert the subschema directives into explicit configuration setting.

It also provides pre-built directives to be used with code-first schemas that do not parse SDL. The validator is configured to read directives from GraphQL entity extensions, which actually take priority when present over the SDL.

The `@graphql-tools/utils` package also exports a function that can print these "directives within extensions" as actual directives that can be then exposed via subservice to the gateway.

Note: the service setup in this example is based on the [official demonstration repository](https://github.com/apollographql/federation-demo) for
[Apollo Federation](https://www.apollographql.com/docs/federation/).

**This example demonstrates:**

- Use of the @key, @computed and @merge "directives within extensions" to specify type merging configuration.

## Setup

```shell
cd code-first-schemas

yarn install
yarn start-services
```

The following services are available for interactive queries:

- **Stitched gateway:** http://localhost:4000/graphql
- _Accounts subservice_: http://localhost:4001/graphql
- _Inventory subservice_: http://localhost:4002/graphql
- _Products subservice_: http://localhost:4003/graphql
- _Reviews subservice_: http://localhost:4004/graphql

## Summary

First, try a query that includes data from all services:

```graphql
query {
  products(upcs: [1, 2]) {
    name
    price wit
    weight
    inStock
    shippingEstimate
    reviews {
      id
      body
      author {
        name
        username
        totalReviews
      }
      product {
        name
        price
      }
    }
  }
}
```

Neat, it works! All those merges were configured through schema annotations within code-first directives in extensions! 