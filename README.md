# Schema Stitching demos

Self-guided examples of [Schema Stitching](https://www.graphql-tools.com/docs/stitch-combining-schemas) doing awesome things. Focuses on the new (GraphQL Tools v6+) stitching using [type merging](https://www.graphql-tools.com/docs/stitch-type-merging), not legacy [Apollo Stitching](https://www.apollographql.com/docs/federation/migrating-from-stitching/).

## Table of Contents

- **Example 1 - Combining local and remote schemas**

  - Adding a locally-executable schema.
  - Adding a remote schema, fetched via introspection.
  - Adding a remote schema, fetched from a custom SDL service.
  - Avoiding schema conflicts using transforms.
  - Basic error handling.

- **Example 2 - Unbatched Type Merging**

  - Establishing a [one-way type merge](https://www.graphql-tools.com/docs/stitch-type-merging#unidirectional-merges) (unbatched).
  - Establishing a [multi-directional type merge](https://www.graphql-tools.com/docs/stitch-type-merging#basic-example) (unbatched).
  - Writing unbatched type merge config.
