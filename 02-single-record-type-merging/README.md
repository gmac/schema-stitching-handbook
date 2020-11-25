# Example 2 – Single-record type merging

Schema Stitching gets a lot more interesting once GraphQL types begin crossing service boundaries. Schema Stitching uses a merge strategy that allows _portions_ of a gateway schema type to originate from many underlying subschemas. This example demonstrates some core techniques for merging typed objects across stitched schemas.

This example achieves type merging using only single-record queries&mdash;meaning that every record accessed requires a dedicated subschema delegation. While we can enable [query batching](#) to soften the blow of sending many operations to a subservice, this 1:1 delegation strategy still has far greater execution overhead than the array-batched technique discussed in the [third example](../03-array-batched-type-merge). This single-record strategy is really only appropraite out of necessity when interfacing with schemas we don't control.

If you're managing all of your own subservices, then skip ahead to the [third example](../03-array-batched-type-merge) for an optimal implementation of this same example.

**This example demonstrates:**

- Establishing a [one-way type merge](https://www.graphql-tools.com/docs/stitch-type-merging#unidirectional-merges) using single-record queries.
- Establishing a [multi-directional type merge](https://www.graphql-tools.com/docs/stitch-type-merging#basic-example) using single-record queries.
- Writing single-record type merge config.

## Setup

```shell
cd 02-single-record-type-merging

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

That means the gateway performed four rounds of delegations to resolve each generation of data (`Services -> Products -> Manufacturers -> Products`). HOWEVER – each round of delegations involved a single delegation _per record_ in the round, which is expensive to process. Using the array-batching technique in [example three](../03-array-batched-type-merge), we can reduce this down to one flat delegation per round.
