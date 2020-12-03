# Example 2 – Single-record type merging

This example explores the core techniques for merging typed objects using single-record queries, covering most of the topics discussed in the [documented basic example](https://www.graphql-tools.com/docs/stitch-type-merging#basic-example).

Using single-record queries means that every record accessed requires a _dedicated_ subschema delegation, which is not ideal. This 1:1 execution pattern has far greater overhead than the array-batched technique discussed in [example three](../03-array-batched-type-merging). However, it's still useful when interacting with services beyond our control, and is an excellent way to study how [execution batching](https://github.com/gmac/schema-stitching-demos/wiki/Batching-Arrays-and-Queries#what-is-query-batching) works.

**This example demonstrates:**

- Establishing a [one-way type merge](https://www.graphql-tools.com/docs/stitch-type-merging#unidirectional-merges) using single-record queries.
- Establishing a [multi-directional type merge](https://www.graphql-tools.com/docs/stitch-type-merging#basic-example) using single-record queries.
- Query/execution batching.

## Setup

```shell
cd 02-single-record-type-merging

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

That means the gateway performed four rounds of resolution for each generation of data (`Services -> Products -> Manufacturers -> Products`).

### Batching

While the gateway performed four _rounds_ of resolution, it actually had to perform a single subschema delegation (or, proxy) _per record_ in each round because we're only fetching one record at a time. This is both expensive for the gateway to process, and for the subservice to fulfill. Thankfully, schema stitching has a built-in solution for the later inefficiency. Clear your gateway terminal log and then run the following query:

```graphql
query {
  storefront(id: "2") {
    products {
      upc
      name
    }
  }
}
```

The Products service executor is configured to log all operations it sends to its subservice, so you can watch what's happening in the gateway terminal tab. Find these lines in the root `index.js` file and try adjusting the `batch` setting, then rerunning the above query:

```js
schema: await introspectSchema(productsExec),
executor: makeRemoteExecutor('http://localhost:4002/graphql', { log: true }),
batch: true, // << try turning this on and off
```

When `batch: false` is set, you'll see the following console output:

```
OPERATION 2020-12-03T15:32:41.900Z:
query ($_v0_upc: ID!) {
  product(upc: $_v0_upc) {
    __typename
    name
    upc
  }
}

OPERATION 2020-12-03T15:32:41.901Z:
query ($_v0_upc: ID!) {
  product(upc: $_v0_upc) {
    __typename
    name
    upc
  }
}

OPERATION 2020-12-03T15:32:41.903Z:
query ($_v0_upc: ID!) {
  product(upc: $_v0_upc) {
    __typename
    name
    upc
  }
}
```

Notice that we're sending **three seperate requests** to the Products service to resolve each record in the product set. That's extremely inefficient. Switching to `batch: true` changes this operation to:

```shell
OPERATION 2020-12-03T15:36:22.889Z:
query ($graphqlTools0__v0_upc: ID!, $graphqlTools1__v0_upc: ID!, $graphqlTools2__v0_upc: ID!) {
  graphqlTools0_product: product(upc: $graphqlTools0__v0_upc) {
    __typename
    name
    upc
  }
  graphqlTools1_product: product(upc: $graphqlTools1__v0_upc) {
    __typename
    name
    upc
  }
  graphqlTools2_product: product(upc: $graphqlTools2__v0_upc) {
    __typename
    name
    upc
  }
}
```

Now we're sending a **single request** that resolves all three single-record queries at once thanks to the magic of [batched execution](https://github.com/gmac/schema-stitching-demos/wiki/Batching-Arrays-and-Queries#what-is-query-batching). Generally speaking, there are very few reasons NOT to enable this free optimization (it will be the default in future releases).

Batch execution greatly optimized our exchange with the subservice. However, we still have overhead costs associated with processing each record individually within the gateway, so execution batching alone is not the best solution. This can be further optimized by delegating arrays of records at a time, as discussed in [chapter three](../03-array-batched-type-merging).
