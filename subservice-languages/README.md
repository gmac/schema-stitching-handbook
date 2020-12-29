# Subservice languages

A stitched gateway is unconcerned with what programming language(s) subservices use as long as they can provide an annotated SDL and fulfill their schema contract. The examples below demonstrate setting up stitching SDLs using a variety of languages and tools.

When using [static JavaScript stitching config](https://www.graphql-tools.com/docs/stitch-type-merging), subservices don't even need to provide an annotated SDL, at which time no special subservice setup is necessary.

- **[JavaScript](./javascript)** schemas created with:
  - `graphql-js`
  - `nexus`
  - `type-graphql`

- **[Ruby](./ruby)** schemas created with:
  - Class-based definitions
  - Parsed definitions string
