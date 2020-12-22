# Chapter 12 – Continuous Integration Testing

This example demonstrates setting up test coverage for a stitched schema. Like all application code, sitched schemas are subject to development errors and therefore should also be tested rigourously through a continuous integration pipeline while [versioning schema releases](../versioning-schema-releases).

Effective test coverage happens at two levels:

1. **Subservices are tested individually.** Subservices are normally managed in their own repos, and should have their own exhaustive test coverage of their schema, resolver code, and database transactions. Testing a standalone service API follows standard software development practices and is [widely](https://blog.testproject.io/2020/06/23/testing-graphql-api/) [discussed](https://medium.com/entria/testing-a-graphql-server-using-jest-4e00d0e4980e) elsewhere. With subservice test coverage in place, the gateway should take subschemas at face-value as GraphQL resources that "just work".
2. **The gateway app tests the stitched schema.** Within the gateway repo, we'll want to stitch all subschemas together and then validate interactions between subschemas. Having subschemas simply compose together without error is not necessarily a reflection on implementation integrity. This testing process is unique, so is discussed at length below.

**This example demonstrates:**

- Adding test coverage to a stitched schema.
- Mocking subservices as local test fixtures.

**Related examples:**

- See [versioning schema releases](../versioning-schema-releases) for ideas on versioning strategies that accompany testing.

## Setup

```shell
cd continuous-integration-testing

yarn install
yarn test
```

The main focus of this example is the test suite itself. The basic server configuration is only provided for context.

## Summary

This example builds its test suite upon a strategic setup:

1. Versioned copies of subservice schemas are available in the stitched gateway's repo. As discussed in [versioning schema releases](../versioning-schema-releases), there are numerous advantages to versioning published subservice schemas with the gateway application&mdash;among them being the ability to test subschemas and stitching code together.
2. The `lib/schema_builder.js` code builds a stitched schema used by the production server _and the test suite_. In this example, subschema configs are built separately from the stitched schema; this allows tests to build subschema configs, adjust them for testing, and then build them into the stitched schema.

### Mocking subservices

Remote subservices are not available during continuous integration testing, so the gateway test suite must localize remote interactions. There are numerous ways to do this, some work better than others...

* **Recorded tests:** packages such as [node-replay](https://github.com/assaf/node-replay) will record HTTP interactions within development mode and "play them back" during subsequent testing. Recorded tests are notoriously fragile, and stitching interactions are no exception. Incremental updates in stitching code may modify subservice requests in benign ways (reordering fields, etc), and that may invalidate recorded tests.
* **Mocked endpoints:** packages such as [nock](https://github.com/nock/nock) allow network endpoints to be mocked with static data responses. While this pattern is more tolerant of library updates, it's also quite fragile when curated subservice responses grow stale over time.
* **Mocked subschemas:** the most durable approach to testing a stitched schema is to run live GraphQL exchanges from end-to-end via mocking. Assuming that subservices are rigorously tested in isolation, a locally-mocked schema becomes a drop-in replacement for its service contract. Mocks will dynamically follow evolutions in stitching code, and stale data fixtures will break within the mock itself, forcing tests to be updated.

This example builds simple mock service implementations within the `test/mock_services` directory. Each mocked service contains `resolvers` for fulfilling select fields with simple data fixtures, and `mocks` used to fill in static values for unspecified fields. Note that in `test_helper.js`, all services fill in unresolved strings with a constant service-specific value:

```graphql
mocks: {
  String: () => `${name}-value`,
}
```

This makes all unspecified `String` fields return a constant `"serviceName-value"`; a similar pattern is used in the Products service to return a constant integer. These mocked subservice schemas make all fields resolve either a data fixture, or else a recognizable constant provided by the schema.

### Writing test queries

When writing queries against a mocked gateway schema, you can probe as deeply as you'd like into resolver paths that span across services, and expect them to return fully-formed results:

```js
const { data } = await queryMockedGateway(`{
  user(id: "1") {
    # id << must work without this selected
    name
    username
    reviews {
      # id << must work without this selected
      body
      product {
        # upc << must work without this selected
        name
        price
        weight
      }
    }
  }
}`);
```

However, notice that fields included in `@key(selectionSet: ...)` directives have been deliberately commented out (`id` and `upc`). We expect the stitching implementation to automatically collect key selection fields used to connect services, so we're placing higher expectations upon the stitching implementation by NOT selecting these fields manually.
