# Chapter 11 – Versioning schema releases

This example demonstrates using a GitHub repo as a central registry that coordinates the versioning and release of subschemas. Similar to the goals of [managed federation](https://www.apollographql.com/docs/federation/managed-federation/overview/), a central registry allows subschemas to be precomposed and tested together before releasing into production. This isn't difficult to setup&mdash;a simple Git repo with some light code wrappings can generally get the job done as well or better than [hosted services](https://www.apollographql.com/docs/studio/getting-started/#1-create-your-account). In fact, using a Git repo offers several distinct advantages:

- Multiple subservice schemas may be composed on a branch together and released at once, affording the opportunity for hard schema cutovers across multiple services.
- Comprehensive test suites may be written to assure the integrity of the composed gateway schema, and can easily run using standard [continuous integration services](https://docs.github.com/en/free-pro-team@latest/actions). Infact, versioning subschemas _in your gateway app's repo_ even allows CI to run tests using both your release candidate schemas and your actual gateway server code.
- Git is a defacto-standard tool with numerous frontends available, and can be adapted to meet virtually any versioning and deployment needs.

**This example demonstrates:**

- Using GitHub API to manage a simple schema registry.
- Hot reloading from a remote Git repo.
- Running development and production environments.

## Setup

```shell
cd versioning-schema-releases
yarn install
```

### 1. Configure a registry repo

This example uses live integration with the GitHub API. You'll need to setup your repo:

1. Create a [new GitHub repo](https://github.com/new) _with a README_ (or other default file, so long as the repo is not empty). Public or private doesn't matter.
2. Create a [personal access token](https://docs.github.com/en/free-pro-team@latest/github/authenticating-to-github/creating-a-personal-access-token) with (only) `repo` access.
3. Make a copy of the provided `repo.template.json` file named `repo.json`. This copy will contain secrets and is `gitignored`. Add the following:
  - `owner`: your GitHub username
  - `repo`: name of the new repo
  - `token`: your personal access token
  - `mainBranch`: name of the default (master) branch in your repo; GitHub defaults to `main`, but you can customize that.
  - `registryPath`: a directory path to where versioned schemas will be managed from.

### 2. Dev server &amp; initial schema commit

With that done, you're ready to start `development` mode:

```shell
yarn start-development
```

The following services are available for interactive queries:

- **Development gateway:** http://localhost:4000/graphql
- _Inventory subservice_: http://localhost:4001/graphql
- _Products subservice_: http://localhost:4002/graphql

Visit the gateway, and note that you have some development-only mutations available:

- `createSchemaReleaseBranch`
- `updateSchemaReleaseBranch`
- `createOrUpdateSchemaReleaseBranch`

Run a `createSchemaReleaseBranch` to build a release candidate:

```graphql
mutation {
  createSchemaReleaseBranch(name: "initial-release") {
    name
    commitSHA
    commitUrl
    pullRequestUrl
  }
}
```

The `name` argument is a GitHub branch name for this release candidate. Running that mutation, you should get a response that includes the `pullRequestUrl` of a newly-created PR in the remote repo that contains the initial schema version. Review it on GitHub, then **merge that PR!** If you didn't get a PR link, check your repo config.

### 3. Production server

Now that you've comitted an initial version of your schema to the registry repo, you're ready to start the production server (the initial commit _must be made first_ so that your production server has a schema to load).

In a second terminal window:

```shell
yarn start-production
```

The following services are now available for interactive queries:

- **Production gateway:** http://localhost:4444/graphql
- **Development gateway:** http://localhost:4000/graphql
- _Inventory subservice_: http://localhost:4001/graphql
- _Products subservice_: http://localhost:4002/graphql

### 4. Hot-reload version releases

You'll notice that the production server is polling the registry repo for version changes. Let's give it some... go into the Products subservice and add a new dummy field to the `Product` type:

```graphql
type Product {
  ...
  dummy: String
}
```

Now commit those changes to a release candidate:

```graphql
mutation {
  createOrUpdateSchemaReleaseBranch(name: "incremental-release") {
    name
    commitSHA
    commitUrl
    pullRequestUrl
  }
}
```

Try adding another dummy field to the schema, and then run that mutation again to add the additional change into the release branch. You can even make changes to both subservices and stage them together for release.

With all changes staged in your PR, watch the `production` gateway terminal logs and then merge the release PR. You should see the production gateway cutover on the next polling cycle (remember, you'll still need to reload GraphiQL to populate the revised schema in the UI):

```shell
version 1607572592741: 9d2a592013beddcca779e58d5f8fbb6930434ef4
version 1607572592741: 9d2a592013beddcca779e58d5f8fbb6930434ef4
VERSION UPDATE: d2709f88d9f60994d6d248902b8183534d4715a9
version 1607572603563: d2709f88d9f60994d6d248902b8183534d4715a9
```

## Summary

Tktk...
