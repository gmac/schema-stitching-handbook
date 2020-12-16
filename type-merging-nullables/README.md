# Chapter 6 – Nullable merges

This example demonstrates using nullable and not-null fields in merged data, as discussed in [null records documentation](https://www.graphql-tools.com/docs/stitch-type-merging#null-records).

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

This example explores the subtleties of nullable fields and returns within a stitched schema. The primary focus of this example is the Reviews service, where the `User` and `Product` types take slightly different approaches to the nullability of their respective `reviews` association. For context, start the gateway and try running this query:

```graphql
query {
  users(ids: [2]) {
    username
    reviews {
      body
    }
  }
  products(upcs: [2]) {
    name
    reviews {
      body
    }
  }
}
```

This query fetches a user and a product, both without any associated reviews. You'll notice they handle this empty association in slightly different ways:

```json
{
  "data": {
    "users": [
      {
        "username": "bigvader23",
        "reviews": []
      }
    ],
    "products": [
      {
        "name": "Toothbrush",
        "reviews": null
      }
    ]
  }
}
```

### Not-null associations

First go into the Reviews service and compare its `User` type to the implementation of its `_users` query resolver:

**schema:**

```graphql
type User {
  id: ID!
  reviews: [Review]!
}
```

**query resolver:**

```js
_users: (root, { ids }) => ids.map(id => ({ id }))
```

In this implementation, _any_ ID submitted to the `_users` query will be treated as a valid record and may resolve a result, for example:

```graphql
query {
  _users(ids: ["DOES_NOT_EXIST"]) {
    id
    reviews { body }
  }
}

# --> [{ id: 'DOES_NOT_EXIST', reviews: [] }]
```

What's odd about this is that the Reviews service is resolving a record for the `"DOES_NOT_EXIST"` ID on the blind assumption that it must exist somewhere. In effect, the query is parroting all input into a legitimized result. Should it? That's entirely up to your own service architecture. One possible advantage this pattern offers is that the not-null `reviews:[Review]!` association works because the service always guarentees a record with populated fields.

### Nullable associations

Now go into the Reviews service and compare its `Product` type to the implementation of its `_products` query resolver:

**schema:**

```graphql
type Product {
  upc: ID!
  reviews: [Review]
}
```

**query resolver:**

```js
_products: (root, { upcs }) => upcs.map(upc => reviews.find(r => r.productUpc === upc) ? ({ upc }) : null)
```

In this implementation, only product UPCs that match a review in the database are treated a valid records. Unknown records simply return null _without errors_, for example:

```graphql
query {
  _products(ids: ["DOES_NOT_EXIST"]) {
    id
    reviews { body }
  }
}

# --> [null]
```

From a pure service-oriented architecture perspective, this result makes more sense because the Reviews service abstains from opinion on unknown IDs; it neither legitimizes with result, nor delegitimizes with error. The only requirement for this to work is that the `reviews:[Review]` association must be nullable because a value may not always be returned. The `upc:ID!` field may still be not-null because it's part of the merged type's selectionSet (see gateway setup in `index.js`), and therefore will always be collected from other services.

### Which approach is correct?

That depends. What are your requirements, and what makes the most sense? In general, erring on the side of returning null rather than a fabricated record is probably the more "pure" approach.
