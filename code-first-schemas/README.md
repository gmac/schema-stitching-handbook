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

Neat, it works! All those merges were configured through schema annotations within schemas!

### Accounts subservice

The Accounts subservice showcases how schemas created with vanilla `graphql-js` can also utilize stitching directives to achieve the benefits of colocating types and their merge configuration, including support for hot-reloading:

- _Directive usages_: implemented as "directives within extensions," i.e. following the Gatsby/graphql-compose convention of embedding third party directives under the `directives` key of each GraphQL entity's `extensions` property.
- _Directive declarations_: directly added to the schema by using the compiled directives exported by the `@graphql-tools/stitching-directives` package.  

### Inventory subservice

The Inventory subservice demonstrates using stitching directives with a schema created using the `nexus` library:

- _Directive usages_: implemented as "directives within extensions," i.e. following the Gatsby/graphql-compose convention of embedding third party directives under the `directives` key of each GraphQL entity's `extensions` property.
- _Directive declarations_: `nexus` does not yet support custom directive declarations, and so the directives type definitions exported by the `@graphql-tools/stitching-directives` package are added to the schema using the `extendSchema` method from `graphql-js` .  

### Products subservice

The Products subservice shows how `TypeGraphQL` can easily implement third party directives including stitching directives.

- _Directive usages_: implemented using the @Directive decorator syntax, TypeGraphQL's method of supporting third party directives within its code-first schema.
- _Directive declarations_: not strictly required -- TypeGraphQL does not validate the directive usage SDL, and creates actual directives under the hood, as if they were created with SDL, so directive declarations are actually not required. This makes setup a bit easier, at the cost of skipping a potentially helpful validation step.

# Reviews subservice
The Reviews subservice is available for comparison to remind us of how `makeExecutableSchema` utilizes directives with SDL.

- _Directive usages_: implemented using directives within actual SDL.
- _Directive declarations_: directive type definitions are imported from the `@graphql-tools/stitching-directives` package.
