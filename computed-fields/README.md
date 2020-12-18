# Chapter 7 – Computed fields

This example demonstrates the core techniques for passing field dependencies between subservices, covering most of the topics discussed in the official [computed fields documentation](https://www.graphql-tools.com/docs/stitch-type-merging#computed-fields).

Computed fields involve selecting data from various services, and then sending that data as input into another service that internally computes a result upon it. If you're familiar with the `_entities` query of the [Apollo Federation spec](https://www.apollographql.com/docs/federation/federation-spec/#query_entities), computed fields work pretty much the same way. Computed fields are fairly complex and therefore not a preferred solution for basic needs. However, they can solve some tricky problems involving the directionality of foreign keys.

_In general, computed fields are most appropraite when:_

- A service holds foreign keys without their associated type information (i.e. a service knows an ID but doesn't know its type). In these cases, the keys can be sent to a remote service to be resolved into typed objects.
- A service manages a collection of bespoke GraphQL types that are of no concern to the rest of the service architecture. In such cases, it may make sense to encapsulate the service by sending external types _in_ for data rather than releasing its types _out_ into the greater service architecture.

_However, computed fields have several distinct disadvantages:_

- A subservice with computed fields cannot independently resolve its full schema without input from other services. This means computed fields are defunct holes in a subschema unless accessed through the gateway with dependencies satisfied.
- Computed fields rely on passing complex object keys between services rather than primitive scalar keys. Where a primitive key may be recognized as empty and therefore skip requesting data, complex object keys are always seen as truthy values even if their _contents_ are empty. Thus, the gateway is forced to always request data on their behalf, even for predictably empty results.

**This example demonstrates:**

- Configuring computed fields.
- Sending complex inputs to subservices.
- Normalizing subservice deprecations in the gateway.

**Related examples:**

- See [stitching directives SDL](../stitching-directives-sdl) to write computed fields as schema directives.

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

The `category` and `metadata` associations come from the Metadata service, and are merged with Products service data using computed fields (this configuration can also be written using [schema directives](../stitching-directives-sdl)):

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

In this pattern, the `category` and `metadata` fields each specify _field-level selection sets_ that will only be collected from other services when the computed field is request. The results of these selection sets are built into an object key and sent off to the Metadata service to be resolved into its version of the `Product` type.

_metadata schema:_

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

### Resolving metadata

The `metadata` association is a pretty good candidate for computed fields.

Looking at the way associations are structured, the Products service holds metadata record IDs without any associated type information. Therefore, the Products service must send these untyped IDs over to the Metadata service to be resolved into type objects (this is inherently a shortcoming of the data model&mdash;in a perfect solution, association data would be migrated over to the Metadata service where both ID and type information is available).

Even if the Products service had all association data available though, there's still some merit in having the Metadata service _internalize_ the `Product` type rather than _externalizing_ all of its bespoke Metadata types. Encapsulation of concerns is a valid factor to weigh against implementation complexity.

### Resolving category

The `catagory` association is needlessly complex using computed fields. It could just as easily use a [basic foreign key pattern](../type-merging-single-records) in the Products service, which would eliminate the unsightly `categoryId` field from its schema:

_products schema:_

```graphql
type Product {
  ...
  # categoryId: ID << remove this
  category: Category
}

type Category {
  id: ID!
}
```

### Deprecating subservice inconsistencies

One of the biggest shortcomings of computed fields is their inconsistency&mdash;they cannot be resolved outside of gateway context where their dependencies are satisfied. If you also utilize the subservice as a standalone GraphQL resource, then computed fields appear as defunct holes in its schema.

An imperfect solution to this problem is to deprecate all computed fields in the subservice, and then remove those deprecations in the gateway proxy layer. For example:

_metadata schema:_

```graphql
type Product {
  category: Category @deprecated(reason: "gateway access only")
  metadata: [Metadata] @deprecated(reason: "gateway access only")
}
```

_index.js:_

```js
const { stitchSchemas } = require('@graphql-tools/stitch');
const { RemoveObjectFieldDeprecations } = require('@graphql-tools/wrap');

stitchSchemas({
  subschemas: [{
    schema: require('./services/metadata/schema'),
    transforms: [new RemoveObjectFieldDeprecations('gateway access only')],
  }]
});
```

The `RemoveObjectFieldDeprecations` transform will un-deprecate these fields within the gateway schema. The subservice-level deprecations at least offer some insight on why certain fields don't work when accessed directly.
