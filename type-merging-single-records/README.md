# Single-record type merging

**Watch the [chapter video](https://www.youtube.com/watch?v=KBACiSA5sEQ)**

[![Single-Record Type Merge video](../images/video-player.png)](https://www.youtube.com/watch?v=KBACiSA5sEQ)

This example explores the core techniques for merging typed objects across subschemas using single-record queries, covering most of the topics discussed in the [documented basic example](https://www.graphql-tools.com/docs/stitch-type-merging#basic-example).

Using single-record queries means that every record accessed requires a _dedicated_ subschema delegation, versus a single delegation for an entire set of records. This 1:1 delegation strategy has far greater overhead than the array-batched technique discussed in the [merged arrays chapter](../type-merging-arrays). However&mdash;it's still useful when interacting with services beyond our control, and it's an excellent way to observe the behavior of [execution batching](https://github.com/gmac/schema-stitching-demos/wiki/Batching-Arrays-and-Queries#what-is-query-batching).

**This example demonstrates:**

- [One-way type merging](https://www.graphql-tools.com/docs/stitch-type-merging#unidirectional-merges) using single-record queries.
- [Multi-directional type merging](https://www.graphql-tools.com/docs/stitch-type-merging#basic-example) using single-record queries.
- Query/execution batching.

**Related examples:**

- See [array-batched type merging](../type-merging-arrays) to improve the performance of these basic patterns.
- See [stitching directives SDL](../stitching-directives-sdl) to write this merge configuration as schema directives.

## Setup

```shell
cd type-merging-single-records

yarn install
yarn start
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
        products {
          upc
          name
        }
        name
      }
    }
  }
}
```

If you study the results of this query, the final composition traverses across the service graph:

- `Storefront` (Storefronts schema)
  - `Storefront.products -> Product` (Products schema)
    - `Product.manufacturer -> Manufacturer` (Products + Manufacturers schemas)
      - `Manufacturer.products` (Products schema)
      - `Manufacturer.name` (Manufacturers schema)

That means the gateway performed three rounds of resolution for each service's data (`Services -> Products -> Manufacturers`).

### Batching

While the gateway performed three _rounds_ of resolution, it actually had to perform a single subschema delegation (or, proxy) _per record_ in each round because we're only fetching one record at a time. This is both expensive for the gateway to process, and for the subservice to fulfill. Thankfully, stitching has a built-in solution for the later inefficiency. Clear your gateway terminal log and run the following query in GraphiQL:

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

The Products executor is setup to log all of its operations, so you can watch what's being requested in the gateway terminal window. Find these lines in the root `index.js` file and try adjusting the `batch` setting:

```js
schema: await introspectSchema(productsExec),
executor: makeRemoteExecutor('http://localhost:4002/graphql', { log: true }),
batch: true, // << try turning this on and off
```

With `batch: false`, the above query logs the following:

```graphql
# -- OPERATION 2020-12-03T15:32:41.900Z:
query ($_v0_upc: ID!) {
  product(upc: $_v0_upc) {
    __typename
    name
    upc
  }
}

# -- OPERATION 2020-12-03T15:32:41.901Z:
query ($_v0_upc: ID!) {
  product(upc: $_v0_upc) {
    __typename
    name
    upc
  }
}

# -- OPERATION 2020-12-03T15:32:41.903Z:
query ($_v0_upc: ID!) {
  product(upc: $_v0_upc) {
    __typename
    name
    upc
  }
}
```

Notice that we're sending **three seperate requests** to the Products service to resolve each record in the product set. That's extremely inefficient. Switching to `batch: true` changes the output to:

```graphql
# -- OPERATION 2020-12-03T15:36:22.889Z:
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

Now we're sending a **single request** that resolves all three single-record queries at once, courtesy of [batched execution](https://github.com/gmac/schema-stitching-demos/wiki/Batching-Arrays-and-Queries#what-is-query-batching). There are very few reasons NOT to enable this free batching optimization (it will be enabled by default in the future).

Batch execution is superb for optimizing the exchange with the subservices. However, there are still overhead processing costs on the gateway for delegating each record individually, so batch execution alone is not a perfect solution. The best optimization strategy is to pair batch execution with delegating [arrays of records](../type-merging-arrays) at a time.
