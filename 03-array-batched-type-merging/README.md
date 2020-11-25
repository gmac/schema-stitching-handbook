# Example 3 – Array-batched type merging

Schema Stitching gets a lot more interesting once GraphQL types begin crossing service boundaries. Schema Stitching uses a [merge strategy](https://www.graphql-tools.com/docs/stitch-type-merging) that allows portions of a gateway schema type to originate from many underlying subschemas. This example demonstrates the core techniques for merging typed objects across stitched schemas.

This example achieves type merging using array queries&mdash;meaning that all records accessed during a round of delegation are batched together and loaded as an array. This technique greatly reduces the execution overhead of [single-record merges](../02-single-record-type-merging), and can be further optimized by enabling [query batching](#). This array-batched strategy is always prefereable to single-record merges and should be used whenever possible.

Note that this is the same as the [second example](../02-single-record-type-merging), simply updated to use array queries.

**This example demonstrates:**

- Establishing a [one-way type merge](https://www.graphql-tools.com/docs/stitch-type-merging#unidirectional-merges) using array queries.
- Establishing a [multi-directional type merge](https://www.graphql-tools.com/docs/stitch-type-merging#basic-example) using array queries.
- Writing array-batched type merge config.
- Handling array errors.

## Setup

```shell
cd 03-array-batched-type-merging

yarn install
yarn start-gateway
```

The following service is available for interactive queries:

- **Stitched gateway:** http://localhost:4000/graphql

For simplicity, all subservices in this example are run locally by the gateway server. You could easily break out any subservice into a standalone remote server following the [combining local and remote schemas](../01-combining-local-and-remote-schemas) example.

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

It is extremely important that errors get _mapped_ into the result set, rather than being thrown (which corrupts the entire result set). Schema stitching will flow errors throughout the stitched document to their final output positions.
