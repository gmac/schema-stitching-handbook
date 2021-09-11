# Custom merge resolvers

This example demonstrates customizing merged type resolvers, expanding upon the [type resolvers documentation](https://www.graphql-tools.com/docs/schema-stitching/stitch-type-merging#type-resolvers).

Stitching implements sensible defaults for resolving merged types: it assumes that querying for a merged type will target a root field that _directly_ returns the type in question (or an abstraction of it). It also assumes that lists will provide a direct mapping of any records requested. These are good and intuitive principles to follow while designing your own stitching services. However, what happens when you need to target a service that does not follow these principles? For example, take an auto-generated [Contentful](https://www.contentful.com/) service:

```graphql
type Product {
  id: String
}

type ProductCollection {
  total: Int
  items: [Product]!
}

type Query {
  productCollection(whereIdIn: [ID!]!): ProductCollection
}
```

There are a few problems with merging the `Product` type using this service pattern. First, the `productCollection` field returns an intermediary collection type rather than a `Product` directly. Second, this accessor performs a _where_ query rather than a _map_; it will omit missing results rather than representing them as null. To stitch around these complications, we have two general approaches:

1. [Transform the schema](https://www.graphql-tools.com/docs/schema-stitching/stitch-combining-schemas#adding-transforms) (and its returned data) into a shape that stitching expects.
2. Write a [custom merge resolver](https://www.graphql-tools.com/docs/schema-stitching/stitch-type-merging#type-resolvers) that acts as an adaptor for this service.

Custom merge resolvers tend to be fundamentally simpler than transforms: rather than adding indirection into a schema to match a stitching default, we can instead customize stitching defaults for specific cases. This is also considerably more efficient. Transforms lean heavily into running visitor traversals on all requests and responses, and may multiply this tax when targeting multiple aspects of a schema. This creates overhead _in every request_, whether the transformation was necessary for the request's content or not. By comparison, custom merge resolvers may apply specific adjusts exactly when and where they are necessary.

**This example demonstrates:**

- TKTK

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

