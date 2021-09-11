# Custom merge resolvers

This example demonstrates customizing merged type resolvers, expanding upon the [type resolvers documentation](https://www.graphql-tools.com/docs/schema-stitching/stitch-type-merging#type-resolvers).

**This example demonstrates:**

- Selecting nullability for merged fields.
- Returning nullable and not-nullable results.

## Setup

```shell
cd type-merging-nullables

yarn install
yarn start
```

The following service is available for interactive queries:

- **Stitched gateway:** http://localhost:4000/graphql

For simplicity, all subservices in this example are run locally by the gateway server. You could easily break out any subservice into a standalone remote server following the [combining local and remote schemas](../combining-local-and-remote-schemas) example.

## Summary

Stitching implements sensible defaults for resolving merged types: it assumes that querying for a merged type will target a root field that _directly_ returns the type in question (or an abstraction of it). It also assumes that lists will provide a direct mapping of any records requested. These are good and intuitive principles to follow while designing your own stitching services.

However, what happens when you need to target a service that does not follow these principles? Take an auto-generated [Contentful](https://www.contentful.com/) service, for example:

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

There are a few oddities for merging the `Product` type using this service pattern. First, the `productCollection` field returns an intermediary collection type rather than a `Product` directly. Second, this accessor performs a _where_ query that will omit requested records that aren't found. To stitch around these factors, we have two general approaches:

1. [Transform the schema](https://www.graphql-tools.com/docs/schema-stitching/stitch-combining-schemas#adding-transforms) and its returned data into a shape that stitching expects.
2. Write a custom merge resolver that acts as an adaptor for this service.

### The case for custom resolvers over transforms

Custom merge resolvers tend to be fundamentally simpler than transforms. Rather than transforming a schema with indirection to match stitching defaults, we can instead customize default behaviors for specific cases. This also tends to be considerably more efficient. Transforms lean heavily into visitor traversals that run on all requests and responses, and may compound when normalizing multiple aspects of a schema. This creates lots of unnecessary work performed in every request whether it was needed in the request or not. By comparison, custom merge resolvers will apply specific adjusts only when they are necessary.
