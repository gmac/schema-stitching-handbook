# Chapter 1 – Combining multiple schema

This chapter demonstrates the basic techniques for combining local and remote schemas together into one API. In the process it explores:

- Incorporating a remote schema via introspection.
- Incorporating a remote schema via a custom protocol.
- Incorporating a locally-executable schema.

## Setup

```
cd chapter01-combining-schemas

yarn install
yarn start-services
```

Then in a new terminal tab:

```
yarn start-gateway
```

The following services are available for interactive queries:

- Stitched gateway: http://localhost:4000/graphql
- Products-only subservice: http://localhost:4001/graphql
- Storefronts-only subservice: http://localhost:4002/graphql

## Overview

Visit the stitched gateway and try running the following query:

```graphql
query {
  product(upc: "2") {
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

The results of this query are live-stitched from three underlying subschemas being proxied into one by the gateway:

- `product` comes from the remote products server. This service is incorporated into the stitched schema via introspection, i.e.: `introspectSchema` from the `@graphql-tools/wrap` package. Introspection is a tidy way to incorporate remote schemas, but be careful: not all GraphQL servers enable introspection, and those that do will no include custom directives.

- `storefront` comes from the remote storefronts server. This service is incorporated into the stitched schema by querying its own SDL from itself through a custom method. While this is less conventional than introspection, it can work with introspection disabled and it can include custom directives.

- `errorCodes` comes from a locally-executable schema run on the gateway server itself. This schema is built using `makeExecutableSchema` from the `@graphql-tools/schema` package, and then imported by the gateway service and stitched directly into the combined schema.

## Error handling

Try fetching a missing record, for example:

```
query {
  product(upc: "99") {
    upc
    name
  }
}
```

Notice that you recieve a meaningful `NOT_FOUND` error rather than an uncontextualized null response. While setting up your API, always returning meaningful resolver errors that may flow through the stitched schema. This is particularily important as stitching begins to remap records across document paths.
