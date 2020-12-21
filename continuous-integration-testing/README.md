# Chapter 12 – Continuous Integration Testing

This example demonstrates setting up test coverage for a stitched schema. Like all application code, sitched schemas are subject to development errors and therefore should also be tested rigourously through a continuous integration pipeline while [versioning schema releases](../versioning-schema-releases).

Effective test coverage happens at two levels:

1. **Subservices are tested individually.** These are normally managed in their own repos, and should have their own exhaustive test coverage on all concerns including server schema, resolver code, and database transactions. This process of testing a standalone API follows standard software development practices and is [widely](https://blog.testproject.io/2020/06/23/testing-graphql-api/) [discussed](https://medium.com/entria/testing-a-graphql-server-using-jest-4e00d0e4980e) elsewhere. With this subservice test coverage in place, the gateway should take subschemas at face value as GraphQL resources that "just work".
2. **Stitched gateway tests the combined schema.** Within the gateway repo, we'll want to stitch all subschemas together and then run operations that validate expected interactions between subschemas. Having subschemas simply compose together without error is not necessarily a measure of integrity. This testing process is a bit more unique, so is the primary focus of this example.

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

The main focus of this example is the test suite itself. The basic server configuration present is simply to provide context.

## Summary

tktk
