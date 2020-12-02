# Schema Stitching demos

Self-guided examples of [Schema Stitching](https://www.graphql-tools.com/docs/stitch-combining-schemas) doing awesome things. Focuses on the new (GraphQL Tools v6+) stitching using [type merging](https://www.graphql-tools.com/docs/stitch-type-merging), not legacy [Apollo Stitching](https://www.apollographql.com/docs/federation/migrating-from-stitching/).

## Table of Contents

- **Example 1 - [Combining local and remote schemas](./01-combining-local-and-remote-schemas)**

  - Adding a locally-executable schema.
  - Adding a remote schema, fetched via introspection.
  - Adding a remote schema, fetched from a custom SDL service.
  - Avoiding schema conflicts using transforms.
  - Basic error handling.

- **Example 2 - [Single-record type merging](./02-single-record-type-merging)**

  - One-way type merge using single-record queries.
  - Multi-directional type merge using single-record queries.
  - Writing single-record type merge config.

- **Example 3 - [Array-batched type merging](./03-array-batched-type-merging)**

  - One-way type merge using array queries.
  - Multi-directional type merge using array queries.
  - Writing array-batched type merge config.
  - Handling array errors.
  - Nullability & error remapping.

- **Example 4 - [Cross-service interfaces](./cross-service-interfaces)**

  - Distributing a GraphQL interface across services.

- **Example 5 - [Mutations &amp; Subscriptions](./mutations-and-subscriptions)**

  - Adding a remote mutation service.
  - Adding a remote subscription service.
  - Adding a subscriber proxy.

- **Example 6 - Computed fields**

  - tktk

- **Example 7 - Federation services**

  - tktk

- **Example 8 - [Stitching directives SDL](./stitching-directives-sdl)**

  - Use of the `@key`, `@merge`, and `@computed` directives to specify type merging configuration.

- **Example 9 - [Hot reloading](./hot-reloading)**

  - Use of a custom executor that times out a request after a pre-specified limit.
  - Addition of custom queries/mutations on the gateway for listing/modifying the configured services.
  - Hot reloading of the gateway schema based on "push" input of service changes and "pull" input of service health.

- **Appendices**

  - [What is Array Batching?](https://github.com/gmac/schema-stitching-demos/wiki/Batching-Arrays-and-Queries#what-is-array-batching)
  - [What is Query Batching?](https://github.com/gmac/schema-stitching-demos/wiki/Batching-Arrays-and-Queries#what-is-query-batching)