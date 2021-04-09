# ![Schema Stitching Handbook](./images/banner-1.jpg)

Guided examples of [Schema Stitching](https://www.graphql-tools.com/docs/stitch-combining-schemas) doing awesome things. Focuses on the new (GraphQL Tools v6+) stitching using [type merging](https://www.graphql-tools.com/docs/stitch-type-merging), not legacy [Apollo Stitching](https://www.apollographql.com/docs/federation/migrating-from-stitching/).

## Table of Contents

### Foundation

- **[Combining local and remote schemas](./combining-local-and-remote-schemas)**

  - Adding a locally-executable schema.
  - Adding a remote schema, fetched via introspection.
  - Adding a remote schema, fetched from a custom SDL service.
  - Avoiding schema conflicts using transforms.
  - Authorization headers.
  - Basic error handling.

- **[Mutations &amp; subscriptions](./mutations-and-subscriptions)**

  - Adding a remote mutation service.
  - Adding a remote subscription service.
  - Adding a subscriber proxy.

- **[Single-record type merging](./type-merging-single-records)**

  - Type merging using single-record queries.
  - Query/execution batching.

- **[Array-batched type merging](./type-merging-arrays)**

  - Type merging using array queries.
  - Handling array errors.
  - Nullability & error remapping.

- **[Nullable merges](./type-merging-nullables)**

  - Selecting nullability for merged fields.
  - Returning nullable and not-nullable results.

- **[Cross-service interfaces](./type-merging-interfaces)**

  - Distributing a GraphQL interface across services.

- **[Merged types with multiple keys](./type-merging-multiple-keys)**

  - Configuring multiple key entry points for a merged type.

- **[Computed fields](./computed-fields)**

  - Configuring computed fields.
  - Sending complex inputs to subservices.
  - Normalizing subservice deprecations in the gateway.

- **[Stitching directives SDL](./stitching-directives-sdl)**

  - `@key` directive for type-level selection sets.
  - `@merge` directive for type merging services.
  - `@computed` directive for computed fields.
  - `@canonical` directive for preferred element definitions.

### Architecture

- **[Hot schema reloading](./hot-schema-reloading)**

  - Hot reload of the combined gateway schema (no server restart).
  - Polling for remote subschema changes.
  - Mutations for adding/removing remote subservices.
  - Handling subservice request timeouts.

- **[Versioning schema releases](./versioning-schema-releases)**

  - Using GitHub API to manage a simple schema registry.
  - Hot reloading from a remote Git registry.
  - Running development and production environments.

- **[Continuous Integration (CI) testing](./continuous-integration-testing)**

  - Adding test coverage to a stitched schema.
  - Mocking subservices as local test fixtures.

- **[Public and private APIs](./public-and-private-apis)**

  - Filtering unwanted fields from the final stitched schema.
  - Serving public (filtered) and private (unfiltered) API versions.

### Other Integrations

- **[Federation services](./federation-services)**

  - Integrating Apollo Federation services into a stitched schema.
  - Fetching and parsing Federation SDLs.

- **[Subservice languages](./subservice-languages)**

  - **[JavaScript](./subservice-languages/javascript)** schemas created with:
    - `graphql-js`
    - `nexus`
    - `type-graphql`

  - **[Ruby](./subservice-languages/ruby)** schemas created with:
    - Class-based definitions
    - Parsed definitions string

### Appendices

- [What is Array Batching?](https://github.com/gmac/schema-stitching-demos/wiki/Batching-Arrays-and-Queries#what-is-array-batching)
- [What is Query Batching?](https://github.com/gmac/schema-stitching-demos/wiki/Batching-Arrays-and-Queries#what-is-query-batching)
