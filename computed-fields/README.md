# Chapter 7 – Computed fields

This example demonstrates the core techniques for passing field dependencies between subservices, covering most of the topics discussed in the official [computed fields documentation](https://www.graphql-tools.com/docs/stitch-type-merging#computed-fields).

Computed fields involve selecting data from various services, and then sending that data as input into another service that internally computes a result upon it. If you're familiar with the `_entities` query of the [Apollo Federation spec](https://www.apollographql.com/docs/federation/federation-spec/#query_entities), computed fields work pretty much the same way. Computed fields are fairly complex and therefore not a preferred solution in schema stitching for basic needs. However, they can solve some tricky problems involving the directionality of foreign keys.

**_In general, computed fields are most appropraite when:_**

- A service holds foreign keys without their associated type information (i.e. a service knows an ID but doesn't know its type). In these cases, the keys can be sent to a remote service to be resolved into typed objects.
- A service manages a collection of bespoke GraphQL types that are of no concern to the rest of the service architecture. In such cases, it may make sense to encapsulate the service by sending external types _in_ for data rather than releasing its types _out_ into the greater service architecture.

**_However, computed fields have several distinct disadvantages:_**

- A subservice with computed fields cannot independently resolve its complete schema without input from other services. Outside of the gateway context where services are linked together, computed fields are left as defunct holes in a subschema.
- Computed fields rely on passing complex object keys between services, versus primitive scalar keys. While a primitive key may be recognized as empty and therefore skip requesting data, complex object keys are always seen as truthy values even if their _contents_ are empty. Thus, the gateway is forced to always request data on their behalf, even for predictably empty results.

**This example demonstrates:**

- Configuring computed fields.
- Sending complex inputs to subservices.
- Normalizing subservice deprecations in the gateway.

## Setup

```shell
cd computed-fields

yarn install
yarn start-gateway
```

The following service is available for interactive queries:

- **Stitched gateway:** http://localhost:4000/graphql

For simplicity, all subservices in this example are run locally by the gateway server. You could easily break out any subservice into a standalone remote server following the [combining local and remote schemas](../combining-local-and-remote-schemas) example.

## Summary

Visit the [stitched gateway](http://localhost:4000/graphql) and try running the following query:

```graphql
query {
  products(upcs: [1, 2, 3, 4]) {
    name
    price
    category {
      name
    }
    metadata {
      __typename
      name
      ...on GeoLocation {
        name
        lat
        lon
      }
      ...on SportsTeam {
        location {
          name
          lat
          lon
        }
      }
      ...on TelevisionSeries {
        season
      }
    }
  }
}
```

The `category` and `metadata` associations come from the Metadata service, and are merged with Products service data using computed fields:

```js
merge: {
  Product: {
    computedFields: {
      category: { selectionSet: '{ categoryId }' },
      metadata: { selectionSet: '{ metadataIds }' },
    },
    fieldName: '_products',
    key: ({ categoryId, metadataIds }) => ({ categoryId, metadataIds }),
    argsFromKeys: (keys) => ({ keys }),
  }
}
```

In this pattern, the `category` and `metadata` fields each specify _field-level selection sets_; these selection sets will only be collected from other services when the associated field is request. The results of these selection sets are built into an object key and sent off to the Metadata service to be built into its version of the `Product` type:

**metadata schema:**

```graphql
type Product {
  category: Category
  metadata: [Metadata]
}

input ProductKey {
  categoryId: ID
  metadataIds: [ID!]
}

type Query {
  _products(keys: [ProductKey!]!): [Product]!
}
```
