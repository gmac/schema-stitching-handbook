# Chapter 12 – Continuous Integration Testing

This example demonstrates setting up test coverage for a stitched schema. Like all application code, sitched schemas are subject to development errors and therefore should also be tested rigourously through a continuous integration pipeline while [versioning schema releases](../versioning-schema-releases).

Effective test coverage happens at two levels:

1. **Subservices are tested individually.** These are normally managed in their own repos, and should have their own exhaustive test coverage of the server schema, resolver code, and database transactions. Testing a standalone API follows standard software development practices and is [widely](https://blog.testproject.io/2020/06/23/testing-graphql-api/) [discussed](https://medium.com/entria/testing-a-graphql-server-using-jest-4e00d0e4980e) elsewhere. With this subservice test coverage in place, the gateway can take subschemas at face value as GraphQL resources that "just work".
2. **Gateway app tests the stitched schema.** Within the gateway repo, we'll want to stitch all subschemas together and then run operations that validate expected interactions between subschemas. Having subschemas simply compose together without error is not necessarily a measure of the implementation integrity. This testing process is more unique, so is the primary focus of this example.

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

The main focus of this example is the test suite itself. The basic server configuration is just provided for context.

## Summary

This example builds its test suite around a few assumptions:

1. Versioned copies of subservice schemas are available in the stitched gateway's repo. As discussed in [versioning schema releases](../versioning-schema-releases), there are numerous advantages to versioning your published subservice schemas with your gateway application&mdash;among them being the ability to test subschemas and stitching code together.
2. The `lib/schema_builder.js` library builds the actual stitched schema that runs on a production server. In this example, the construction of subschema configs happens separately from the construction of the stitched schema; this allows tests to build subschema configs, adjust them for testing, and then build them into the stitched schema.

### Mocking subservices

Subservices are unavailable during continuous integration testing, so the gateway test suite must localize remote subservice interactions. There are numerous ways to do this, some work better than others... a few ideas ranked from worst to best include:

* **Recorded tests:** packages such as [node-replay](https://github.com/assaf/node-replay) will record HTTP interactions within development mode and "play them back" during subsequent testing. Recorded tests are notoriously fragile, and stitching interactions are no exception. You'll find that routine updates in stitching code will modify subservice requests in benign ways (order of fields, adding a `__typename`, etc), and that invalidates recorded tests. This builds an aversion to upgrading your Stitching library for fear of breaking recorded tests.
* **Mocked endpoints:** packages such as [nock](https://github.com/nock/nock) allow you to mock network endpoints with static response fixtures. While this pattern is considerably more durable toward library updates, it is equally fragile in that is serves a curated subservice response that may become stale over time.
* **Mocked subschemas:** the most durable approach to testing stitching code is to simply run live GraphQL exchanges from end-to-end. By rigorously testing subservices in isolation, we can assume their schemas are reliable GraphQL contracts&mdash;at which time it doesn't really matter if the same contract is fulfilled by mocks. Mocking will dynamically follow evolutions in stitching code, and stale data fixtures will break within the mock itself, forcing tests to remain in sync with production code.

This example builds some simple service implementations within the `test/mock_services` directory. Each mocked service contains `resolvers` for fulfilling select fields with simple data fixtures, and `mocks` used to fill in static values for unspecified fields. Note in `test_helper.js` that all services fill in unresolved strings with a constant value:

```graphql
mocks: {
  String: () => `${name}-value`,
}
```

Using this pattern, all unspecified `String` fields within the Users service will return `"users-value"`. That means all fields will either resolve a characteristic of a resolved data fixture, or else a recognizable data value mocked for that service. This simple mocking skeleton is fairly easy to maintain, it will raise test failures if it becomes out of sync with its schema, and it will allow the gateway schema to run full queries against local GraphQL resources.

### Writing test queries

When writing queries against the mocked gateway, you can probe as deeply as you'd like into resolver paths that span across services and expect them to return a fully-formed result:

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

Note that we're _deliberately omitting `@key` selectionSet fields_ (those marked as "must work without this selected"). We expect the stitching implementation to automatically collect key selection fields used to connect services, so we're excerpting higher expectations upon the stitching implementation by NOT requesting them manually.
