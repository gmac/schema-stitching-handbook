# Chapter 12 – Continuous Integration Testing

This example demonstrates setting up test coverage for a stitched schema. Like all application code, sitched schemas are subject to development errors and therefore should also be tested rigourously through continuous integration pipelines while [versioning schema releases](../versioning-schema-releases).

Effective test coverage happens at two levels:

1. **Subservices are tested individually.** Subservices are normally managed in their own repos, and should have exhaustive test coverage on all of their own concerns including server schema, resolver code, and database transactions. This process of testing a single API follows standard software development practices and is [widely](https://blog.testproject.io/2020/06/23/testing-graphql-api/) [discussed](https://medium.com/entria/testing-a-graphql-server-using-jest-4e00d0e4980e) elsewhere. With this subservice coverage in place, we can take subschemas at face value within the stitched gateway as GraphQL resources that exist somewhere and "just work".
2. **The stitched gateway tests the combined schema.** Within the stitched gateway repo, we'll want to load up all subschemas and stitch them together, and then run operations that validate the expected interactions between subschemas. Having schemas simply compose together without error is not necessarily a measure of integrity. This testing process is a bit more nuanced, and thus the focus of this example.

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
