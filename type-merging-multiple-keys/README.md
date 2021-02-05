# Type merging with multiple keys

This example explores merging types with multiple key fields. This is a tricky scenario where an intermediary service provides multiple keys that join other services that each only have one of the possible keys. For example:

- Catalog service: `type Product { upc }`
- Vendors service: `type Product { upc id }`
- Reviews service: `type Product { id }`

In the above graph, Catalog and Reviews schemas each have a _different_ key for the `Product` type, while the Vendors service holds both keys and may act as an intermediary join. Given this architecture, we still must be able to perform all possible traversals:

- `Catalog > Ecomm > Reviews`
- `Catalog < Ecomm > Reviews`
- `Catalog < Ecomm < Reviews`

Stitching is capable of handling this service pattern, although configuration wrappings have not been written for it yet (working on it...). At present, this can only be achieved manually with static JavaScript merge config. There are plans to formally support this via `stitchSchemas` configuration and the SDL directives API.

**This example demonstrates:**

- Configuring multiple keys for a stitched schema.

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

Visit the [stitched gateway](http://localhost:4000/graphql) and try running the following query that fetches data from all services following each possible service path:

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

  # ecommerce service
  productsByKey(keys: [
    { upc: "1" },
    { id: "102" }
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

The trick that makes this work is that the products schema (with the two keys) is included in the `subschemas` array twice with the `Product` type configured individually for each key. This configuration matches to how the stitching query planner observes keys in relation to schemas. When connecting to a remote schema, make sure each instance provides the same executor instance, at which time the separate subschemas will still be understood as the same executable resource.

Future improvements will make this configuration simpler and more intuitive.
