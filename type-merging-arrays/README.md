# Chapter 4 – Array-batched type merging

[![Array-batched Type Merge video](../images/video-player.png)](https://www.youtube.com/watch?v=VmK0KBHTcWs)

This example explores the core techniques for merging typed objects using array queries, covering most of the topics discussed in [batched merging documentation](https://www.graphql-tools.com/docs/stitch-type-merging#batching).

This example focuses on [array batching](https://github.com/gmac/schema-stitching-demos/wiki/Batching-Arrays-and-Queries#what-is-array-batching)&mdash;meaning that all records accessed during a round of delegation are batched together and loaded as an array. This technique greatly reduces the execution overhead of [single-record merges](../02-single-record-type-merging), and can be further optimized by enabling [query batching](https://github.com/gmac/schema-stitching-demos/wiki/Batching-Arrays-and-Queries#what-is-query-batching). This array-batched strategy is prefereable to single-record merges and should be used whenever possible.

**This example demonstrates:**

- Establishing a [one-way type merge](https://www.graphql-tools.com/docs/stitch-type-merging#unidirectional-merges) using array queries.
- Establishing a [multi-directional type merge](https://www.graphql-tools.com/docs/stitch-type-merging#basic-example) using array queries.
- Handling array errors.
- Nullability & error remapping.

## Setup

```shell
cd type-merging-arrays

yarn install
yarn start-services
```

Then in a new terminal tab:

```shell
yarn start-gateway
```

The following services are available for interactive queries:

- **Stitched gateway:** http://localhost:4000/graphql
- _Manufacturers subservice_: http://localhost:4001/graphql
- _Products subservice_: http://localhost:4002/graphql
- _Storefronts subservice_: http://localhost:4003/graphql

## Summary

Visit the [stitched gateway](http://localhost:4000/graphql) and try running the following query:

```graphql
query {
  storefront(id: "2") {
    id
    name
    products {
      upc
      name
      manufacturer {
        name
        products {
          upc
          name
        }
      }
    }
  }
}
```

If you study the results of this query, the final composition traverses back and forth across the service graph:

- `Storefront` (Storefronts schema)
  - `Storefront.products -> Product` (Products schema)
    - `Product.manufacturer -> Manufacturer` (Manufacturers + Products schema)
      - `Manufacturer.name` (Manufacturers schema)
      - `Manufacturer.products` (Products schema)

That means the gateway performed four rounds of delegations to resolve each generation of data (`Services -> Products -> Manufacturers -> Products`). With the array-batching technique, the gateway only performs a single delegation per round, regardless of the number of records in the round.

## Error handling

Pay special attention to the error handling used while resolving record arrays:

```js
manufacturers(root, { ids }) {
  return ids.map(id => manufacturers.find(m => m.id === id) || new NotFoundError());
}
```

It is extremely important that errors get _mapped_ into the result set, rather than being thrown (which corrupts the entire result set).

## Nullability + mapped errors

Also run a query for the Product with UPC `"6"`, and you'll see an interesting feature of error handling:

```graphql
query {
  products(upcs: ["6"]) {
    upc
    name
    manufacturer {
      name
    }
  }
}
```

For the purposes of this example, this product intentionally specifies an invalid manufacturer reference. You'll see that the original error from the underlying subservice has flowed through the stitching process and is mapped to its final document position in the stitched schema:

```json
{
  "errors": [
    {
      "message": "Record not found",
      "locations": [],
      "path": [
        "products",
        0,
        "manufacturer"
      ],
      "extensions": {
        "code": "NOT_FOUND"
      }
    }
  ],
  "data": {
    "products": [
      {
        "upc": "6",
        "name": "Baseball Glove",
        "manufacturer": null
      }
    ]
  }
}
```

Note that for this process to work, the `Product.manufacturer` reference must be [nullable](https://graphql.org/learn/schema/#lists-and-non-null), otherwise you'll get a GraphQL nullability-mismatch error when the manufacturer returns an error. For this reason, **it's generally best-practice to make all stitched associations nullable** on the assumption that the record association _could_ fail, at which time it's better to see the subschema failure than a top-level GraphQL nullability error.
