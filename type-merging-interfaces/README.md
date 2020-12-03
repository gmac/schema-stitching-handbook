# Chapter 5 – Cross-service interfaces

This example explores setting up a GraphQL interface that spans across service boundaries, as described in the [merged interfaces documentation](https://www.graphql-tools.com/docs/stitch-type-merging#merged-interfaces). This is an extremely powerful feature made possible by the flexibility of type merging, yet it's easy to overlook.

**This example demonstrates:**

- Distributing a GraphQL interface across services.

## Setup

```shell
cd 04-cross-service-interfaces

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
  storefront(id: "1") {
    id
    name
    products {
      __typename
      id
      name
      price
      ...on ProductDeal {
        products {
          name
          price
        }
      }
    }
  }
}
```

If you study the results here, `Storefront.products` now returns the `ProductOffering` interface:

```graphql
# Products schema
interface ProductOffering {
  id: ID!
  name: String!
  price: Float!
}
```

This interface is now implemented by two types:

- `Product`: a basic product record from the Products service.
- `ProductDeal`: a wrapper for a set of products given a special price, managed in the Storefronts service.

The oddity here is that the Storefronts service knows `Product` only with an `id` field, therefore Storefronts is not able to implement the full interface, it may only implement a subset of it:

```graphql
# Storefronts schema
interface ProductOffering {
  id: ID!
}
```

This is where the flexibility of type merging really shines... by virtue of the merge, `ProductDeal` will adopt the full `ProductOffering` interface in the combined gateway schema.

However, that also means that the gateway schema provides an interface of fields for a type that its implementing subservice does _not_ provide. This difference in field between the gateway interface and the underlying subservice is automatically proxied, where gateway-level fields that don't exist in the subschema will be expanded into typed fragment selections.
