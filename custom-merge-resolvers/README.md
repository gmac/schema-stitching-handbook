# Custom merge resolvers

This example demonstrates customizing merged type resolvers, expanding upon the [type resolvers documentation](https://www.graphql-tools.com/docs/schema-stitching/stitch-type-merging#type-resolvers).

Stitching implements sensible defaults for resolving merged types: it assumes that querying for a merged type will target a root field that _directly_ returns the type (or an abstraction of it). It also assumes that lists will provide a direct mapping of all records requested, including null results. While these are good principles to follow while designing your own stitching services, what happens when you need to target a service that does not implement these specs? For example, take an auto-generated [Contentful](https://www.contentful.com/) service:

```graphql
type Product {
  id: String
}

type ProductCollection {
  total: Int
  items: [Product]
}

type Query {
  productCollection(whereIdIn: [ID!]!): ProductCollection
}
```

There are a few problems with merging the `Product` type using this service pattern. First, the `productCollection` field returns an intermediary collection type rather than a `Product` directly. Second, this accessor performs a _where_ query rather than a _map_; it will omit missing results rather than representing them as null. To stitch around these complications, we have two general approaches:

1. [Transform the schema](https://www.graphql-tools.com/docs/schema-stitching/stitch-combining-schemas#adding-transforms) (and its returned data) into a shape that stitching expects.
2. Write a [custom merge resolver](https://www.graphql-tools.com/docs/schema-stitching/stitch-type-merging#type-resolvers) that acts as an adaptor for this service.

Custom merge resolvers tend to be fundamentally simpler than transforms: rather than adding indirection into a schema to match a stitching default, we can instead customize stitching defaults for specific cases. This is also considerably more efficient. Transforms lean heavily into visitor traversals run on all requests and responses, and may multiply this tax when targeting multiple aspects of a schema. This creates overhead _in every request_, regardless of whether the transformation was relevant to the request's content. By comparison, custom merge resolvers may apply specific adjustments exactly when and where they are necessary.

**This example demonstrates:**

- Using `valuesFromResults` to normalize resulting query data.
- Adapting type merging to query through namespaced scopes.
- Adapting type merging to query through non-root fields.
- Using `batchDelegateToSchema` and `delegateToSchema`.

## Setup

```shell
cd custom-merge-resolvers

yarn install
yarn start
```

The following service is available for interactive queries:

- **Stitched gateway:** http://localhost:4000/graphql

For simplicity, all subservices in this example are run locally by the gateway server. You could easily break out any subservice into a standalone remote server following the [combining local and remote schemas](../combining-local-and-remote-schemas) example.

## Summary

Start the gateway and try running this query:

```graphql
query {
  productsInfo(whereIn: ["1", "X", "2", "3"]) {
    id
    title
    totalInventory
    price
  }
}
```

This query combines fields from three underlying services that each present some challenges to stitch around.

## Using `valuesFromResults`

Starting with the Info service that provides the `Product.title` field, notice that the `productsInfo` query accepts a `whereIn` argument. In the example query above, we requested four IDs but only got three results back for the valid records:

```json
request: ["1", "X", "2", "3"],
result: [
  { "id": "1" },
  { "id": "2" },
  { "id": "3" },
]
```

This is at odds with stitching's expectation of always querying for mapped arrays, which would pad missing values with `null`:

```json
request: ["1", "X", "2", "3"],
result: [
  { "id": "1" },
  null,
  { "id": "2" },
  { "id": "3" },
]
```

To reconcile this difference while resolving merged records from the service, we can use the `valuesFromResults` merged type option to map the resulting records into the originally requested keys:

```js
merge: {
  Product: {
    // ...
    valuesFromResults: (results, keys) => {
      const valuesByKey = Object.create(null);
      for (const val of results) valuesByKey[val.id] = val;
      return keys.map(key => valuesByKey[key] || null);
    }
  }
}
```

## Query through namespaced scopes

Moving onto the Inventory service that provides the `Product.totalInventory` field, merging has to interface with a query that wraps the merged type in a scoped namespace:

```graphql
type Product {
  id: ID!
  totalInventory: Int
}

type ProductCollection {
  total: Int
  items: [Product]
}

type Query {
  productsInventory(ids: [ID!]!): ProductCollection
}
```

Rather than getting `Product` records directly from the `productsInventory` field, we'll need to reach down into its `items` results scope. Take a look at the custom type resolver in `services/inventory/resolve.js` that handles this. An abridged summary:

```js
function createInventoryResolver(options) {
  return (obj, context, info, subschemaConfig, selectionSet, key) => {
    return batchDelegateToSchema({
      // ...options...

      // Wrap the merged type selection in an "items" scope.
      selectionSet: {
        kind: Kind.SELECTION_SET,
        selections: [{
          kind: Kind.FIELD,
          name: {
            kind: Kind.NAME,
            value: 'items',
          },
          selectionSet
        }]
      },

      // Unpack the "items" scope from results.
      valuesFromResults: (result, keys) => result.items,
    });
  };
};
```

This resolver is very similar to stitching's default merge resolver in that it calls `batchDelegateToSchema` with information about how to query for the merged type. However, instead of passing the type's field selections directly through to delegation, the selections get wrapped in an `items` namespace to match the query. Then, `valuesFromResults` is used to extract the resulting items array as the final result.

## Query through non-root fields

Querying for a merged type through non-root fields presents an even trickier challenge, as in the Pricing service. For example:

```graphql
type Product {
  id: ID!
  price: Int
}

type PricingEngine {
  products(ids: [ID!]!): [Product]!
}

type Query {
  pricing: PricingEngine
}
```

In this situation, we need to send aggregated keys as arguments to a nested document path. This is unfortunately at odds with `batchDelegateToSchema`, because it only handles aggregating keys for root document paths. Pairing a call to the lower-level `delegateToSchema` with our own [DataLoader](https://www.npmjs.com/package/dataloader) wrapper can work around this, see `services/pricing/resolve.js`. An abridged summary:

```js
const cache = new WeakMap();

module.exports = function createPricingResolver(options) {
  return (obj, context, info, subschemaConfig, selectionSet, key) => {
    let loader = cache.get(selectionSet);

    if (loader == null) {
      loader = new DataLoader(async (keys) => {
        const result = await delegateToSchema({
          // ...options...

          // Wrap merged type selection in a deeper field path,
          // and include aggregated keys as sub-field arguments
          selectionSet: {
            kind: Kind.SELECTION_SET,
            selections: [{
              kind: Kind.FIELD,
              name: {
                kind: Kind.NAME,
                value: 'products',
              },
              arguments: [{
                kind: Kind.ARGUMENT,
                name: {
                  kind: Kind.NAME,
                  value: 'ids',
                },
                value: {
                  kind: Kind.LIST,
                  values: keys.map(key => ({
                    kind: Kind.STRING,
                    value: String(key),
                    block: false,
                  }))
                }
              }],
              selectionSet
            }]
          },
        });

        // return the deeply-nested path that provided data
        return result.products;
      });

      cache.set(selectionSet, loader);
    }

    return loader.load(key);
  };
};
```

Here we're basically doing a simplified version of what `batchDelegateToSchema` does under the hood: DataLoader instances are cached in a weak map, keyed by unique field selection. Each time a DataLoader fires, it builds a selection for the extended document path and writes its aggregated keys into the low-level field, then delegates the compiled selection to the subschema directly.
