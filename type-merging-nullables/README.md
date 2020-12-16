# Chapter 6 – Nullable merges

This example demonstrates using null and not-null fields in merged data, as discussed in [Null records documentation](https://www.graphql-tools.com/docs/stitch-type-merging#null-records).

**This example demonstrates:**

- Selecting nullability for merged fields.
- Returning nullable and not-nullable results.

## Setup

```shell
cd type-merging-nullables

yarn install
yarn start-gateway
```

The following service is available for interactive queries:

- **Stitched gateway:** http://localhost:4000/graphql

For simplicity, all subservices in this example are run locally by the gateway server. You could easily break out any subservice into a standalone remote server following the [combining local and remote schemas](../01-combining-local-and-remote-schemas) example.

## Summary

tktk

```graphql
query {
  users(ids: [1, 2]) {
    username
    reviews {
      body
    }
  }
  products(upcs: [1, 2]) {
    name
    reviews {
      body
    }
  }
}
```
