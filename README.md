# Schema Stitching demos

Self-guided examples of [Schema Stitching](https://www.graphql-tools.com/docs/stitch-combining-schemas) doing awesome things. Focuses on the new (GraphQL Tools v6+) stitching using [type merging](https://www.graphql-tools.com/docs/stitch-type-merging), not legacy [Apollo Stitching](https://www.apollographql.com/docs/federation/migrating-from-stitching/).

## Table of Contents

- **Example 1 - Combining local and remote schemas**

  - Adding a locally-executable schema.
  - Adding a remote schema, fetched via introspection.
  - Adding a remote schema, fetched from a custom SDL service.
  - Avoiding schema conflicts using transforms.
  - Basic error handling.

- **Example 2 - Single-record type merging**

  - One-way type merge using single-record queries.
  - Multi-directional type merge using single-record queries.
  - Writing single-record type merge config.

- **Example 3 - Array-batched type merging**

  - One-way type merge using array queries.
  - Multi-directional type merge using array queries.
  - Writing array-batched type merge config.
  - Handling array errors.
  - Nullability & error remapping.

- **Example 4 - Cross-service interfaces**

  - Distributing a GraphQL interface across services.

- **Appendices**

  - [What is Array Batching?](https://github.com/gmac/schema-stitching-demos/wiki/Batching-Arrays-and-Queries#what-is-array-batching)
  - [What is Query Batching?](https://github.com/gmac/schema-stitching-demos/wiki/Batching-Arrays-and-Queries#what-is-query-batching)