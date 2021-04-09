# Type merging with multiple keys

This example explores merging types with multiple key fields. This is a tricky scenario where an intermediary service provides multiple keys that join other services together, while the other services each only have one of the possible keys. For example:

- Catalog service: `type Product { upc }`
- Vendors service: `type Product { upc id }`
- Reviews service: `type Product { id }`

In the above graph, Catalog and Reviews schemas each have a _different_ key for the `Product` type, while the Vendors service holds both keys and may act as an intermediary join. Given this architecture, we must still be able to perform all possible traversals:

- `Catalog > Vendors > Reviews`
- `Catalog < Vendors > Reviews`
- `Catalog < Vendors < Reviews`

Stitching is capable of handling this service pattern using the `entryPoints` property in static JavaScript merge configuration. At present, this property is _not_ configurable using SDL directives, but can be [worked around](#with-sdl-directives).

**This example demonstrates:**

- Configuring multiple key entry points for a subschema.

## Setup

```shell
cd type-merging-multiple-keys

yarn install
yarn start
```

The following service is available for interactive queries:

- **Stitched gateway:** http://localhost:4000/graphql

For simplicity, all subservices in this example are run locally by the gateway server. You could easily break out any subservice into a standalone remote server following the [combining local and remote schemas](../combining-local-and-remote-schemas) example.

## Summary

Visit the [stitched gateway](http://localhost:4000/graphql) and try running the following query that fetches data from all services following each possible service traversal path:

```graphql
query {
  # catalog service
  productsByUpc(upcs: ["1"]) {
    upc
    name
    retailPrice
    reviews {
      id
      body
    }
  }

  # vendors service
  productsByKey(keys: [
    { upc: "1" },
    { id: "101" }
  ]) {
    id
    upc
    name
    retailPrice
    reviews {
      id
      body
    }
  }

  # reviews service
  productsById(ids: ["101"]) {
    id
    name
    retailPrice
    reviews {
      id
      body
    }
  }
}
```

The above queries entering the graph through the Catalog and Reviews services use whatever key they have available to fetch from the intermediary Vendors service, and Vendors provides the missing key for fetching from the opposing service.

## Multiple `entryPoints`

To facilitate this pattern, the Vendors subschema configures the merged `Product` type with multiple entry points – or, separate pathways that access the type using different criteria:

```js
{
  schema: vendorsSchema,
  batch: true, // << enable batching to consolidate requests!
  merge: {
    Product: {
      entryPoints: [{
        selectionSet: '{ upc }',
        fieldName: 'productsByKey',
        key: ({ upc }) => ({ upc }),
        argsFromKeys: (keys) => ({ keys }),
      }, {
        selectionSet: '{ id }',
        fieldName: 'productsByKey',
        key: ({ id }) => ({ id }),
        argsFromKeys: (keys) => ({ keys }),
      }],
    }
  }
}
```

In this example, both entry points reference the `productsByKey` query with specially-tailored arguments. You could just as easily have each entry point reference a different root query that accepts different argument formats.

When using multiple entry points, it is highly recommended that you enable query batching (`batch: true`). This is generally good practice, and becomes particularly important for consolidating requests that may target either entry point.

## With SDL directives

At present, there is not yet an SDL directives pattern that configures multiple entry points (contributions are welcome!). However, SDL configuration and static JavaScript configuration patterns are not mutually exclusive, therefore you can use SDL directives to configure the majority of your API and statically configure the cases where a merged type has multiple entry points. The general pattern looks like this:

```js
const { stitchingDirectivesTransformer } = stitchingDirectives();

const gatewaySchema = stitchSchemas({
  subschemaConfigTransforms: [stitchingDirectivesTransformer],
  subschemas: [
    {
      schema: catalogSchema,
      // merge: { ... built from SDL directives }
    },
    {
      schema: vendorsSchema,
      batch: true,
      merge: {
        // Type1: { ... built from SDL directives },
        // Type2: { ... built from SDL directives },
        Product: {
          entryPoints: [{
            selectionSet: '{ upc }',
            fieldName: 'productsByKey',
            key: ({ upc }) => ({ upc }),
            argsFromKeys: (keys) => ({ keys }),
          }, {
            selectionSet: '{ id }',
            fieldName: 'productsByKey',
            key: ({ id }) => ({ id }),
            argsFromKeys: (keys) => ({ keys }),
          }],
        }
      }
    },
    {
      schema: reviewsSchema,
      // merge: { ... built from SDL directives }
    }
  ]
});
```

The static configuration you define is simply augmented by the stitching directives transformer. There's no harm in configuring some types statically and adding SDL configurations on top. Long-term plans anticipate adding multiple entry points setup into the SDL directives package.
