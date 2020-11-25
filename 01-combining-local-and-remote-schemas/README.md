# Example 1 – Combining local and remote schemas

This example demonstrates basic techniques for combining local and remote schemas together into one API. This covers most topics discussed in the official [Combining Schemas](https://www.graphql-tools.com/docs/stitch-combining-schemas) documentation.

**This example demonstrates:**

- Adding a locally-executable schema.
- Adding a remote schema, fetched via introspection.
- Adding a remote schema, fetched from a custom SDL service.
- Avoiding schema conflicts using transforms.
- Basic error handling.

## Setup

```shell
cd chapter01-combining-schemas

yarn install
yarn start-services
```

Then in a new terminal tab:

```shell
yarn start-gateway
```

The following services are available for interactive queries:

- **Stitched gateway:** http://localhost:4000/graphql
- Products subservice: http://localhost:4001/graphql
- Storefronts subservice: http://localhost:4002/graphql

## Overview

Visit the [stitched gateway](http://localhost:4000/graphql) and try running the following query:

```graphql
query {
  product(upc: "1") {
    upc
    name
  }
  rainforestProduct(upc: "2") {
    upc
    name
  }
  storefront(id: "2") {
    id
    name
  }
  errorCodes
}
```

The results of this query are live-proxied from the underlying subschemas through the stitched gateway:

- `product` comes from the remote Products server. This service is added into the stitched schema using introspection, i.e.: `introspectSchema` from the `@graphql-tools/wrap` package. Introspection is a tidy way to incorporate remote schemas, but be careful: not all GraphQL servers enable introspection, and those that do will not include custom directives.

- `rainforestProduct` also comes from the remote Products server, although here we're pretending it's a third-party API (say, a product database named after a rainforest...). To avoid naming conflicts between our own Products schema and the Rainforest API schema, transforms are used to prefix the names of all types and fields that come from the Rainforest API.

- `storefront` comes from the remote Storefronts server. This service is added to the stitched schema by querying its SDL through its own GraphQL API (how meta). While this is less conventional than introspection, it works with introspection disabled and may include custom directives.

- `errorCodes` comes from a locally-executable schema running on the gateway server itself. This schema is built using `makeExecutableSchema` from the `@graphql-tools/schema` package, and then stitched directly into the combined schema.

## Error handling

Try fetching a missing record; for example:

```
query {
  product(upc: "99") {
    upc
    name
  }
}
```

You'll recieve a meaningful `NOT_FOUND` error rather than an uncontextualized null response. When building your subservices, always return meaningful errors that can flow through the stitched schema. This becomes particularily important once stitching begins to proxy records across document paths, at which time the confusion of uncontextualized failures will compound. Schema stitching errors are only as good as the errors implemented by your subservices.
