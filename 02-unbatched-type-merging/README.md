# Example 2 – Unbatched Type Merging

This example demonstrates the core techniques for merging typed objects across stitched schemas. This example does NOT enable batching, which makes it less desirable for production use than the batched implementation in [example three](#).

**This example demonstrates:**

- Establishing a [one-way type merge](https://www.graphql-tools.com/docs/stitch-type-merging#unidirectional-merges).
- Establishing a [multi-directional type merge](https://www.graphql-tools.com/docs/stitch-type-merging#basic-example).
- Writing unbatched merge config.

## Setup

```shell
cd 02-unbatched-type-merging

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
  - `Storefront.products` (Products schema)
    - `Product.manufacturer` (Manufacturers + Products schema)
      - `Manufacturer.name` (Manufacturers schema)
      - `Manufacturer.products` (Products schema)

That means the gateway performed four rounds of delegations to resolve each generation of data: Services schema, then Products schema, then Manufacturers schema, and finally back to Products schema.
