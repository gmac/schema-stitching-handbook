# Schema Stitching, The Book

Guided examples of [Schema Stitching](https://www.graphql-tools.com/docs/stitch-combining-schemas) doing awesome things. Focuses on the new (GraphQL Tools v6+) stitching using [type merging](https://www.graphql-tools.com/docs/stitch-type-merging), not legacy [Apollo Stitching](https://www.apollographql.com/docs/federation/migrating-from-stitching/).

## Table of Contents

- **[Chapter 1](./01-combining-local-and-remote-schemas) - Combining local and remote schemas**

  - Adding a locally-executable schema.
  - Adding a remote schema, fetched via introspection.
  - Adding a remote schema, fetched from a custom SDL service.
  - Avoiding schema conflicts using transforms.
  - Basic error handling.

- **[Chapter 2](./mutations-and-subscriptions) - Mutations &amp; Subscriptions**

  - Adding a remote mutation service.
  - Adding a remote subscription service.
  - Adding a subscriber proxy.

- **[Chapter 3](./02-single-record-type-merging) - Single-record type merging**

  - One-way type merge using single-record queries.
  - Multi-directional type merge using single-record queries.
  - Query/execution batching.

- **[Chapter 4](./03-array-batched-type-merging) - Array-batched type merging**

  - One-way type merge using array queries.
  - Multi-directional type merge using array queries.
  - Handling array errors.
  - Nullability & error remapping.

- **[Chapter 5](./cross-service-interfaces) - Cross-service interfaces**

  - Distributing a GraphQL interface across services.

- **Chapter 6 - Nullable merges**

  - tktk

- **Chapter 7 - Computed fields**

  - tktk

- **Chapter 8 - Federation services**

  - tktk

- **[Chapter 9](./stitching-directives-sdl) - Stitching directives SDL**

  - Use of the `@key`, `@merge`, and `@computed` directives to specify type merging configuration.

- **[Chapter 10](./hot-schema-reloading) - Hot schema reloading**

  - Use of a custom executor that times out a request after a pre-specified limit.
  - Addition of custom queries/mutations on the gateway for listing/modifying the configured services.
  - Hot reloading of the gateway schema based on "push" input of service changes and "pull" input of service health.

- **Appendices**

  - [What is Array Batching?](https://github.com/gmac/schema-stitching-demos/wiki/Batching-Arrays-and-Queries#what-is-array-batching)
  - [What is Query Batching?](https://github.com/gmac/schema-stitching-demos/wiki/Batching-Arrays-and-Queries#what-is-query-batching)