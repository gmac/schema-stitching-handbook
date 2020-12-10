# Chapter 11 – Schema registry &amp; versioning

This example demonstrates using a git repo (on GitHub) as a central registry for versioning and releasing schemas.

**This example demonstrates:**

- Using GitHub API to manage a simple schema registry.
- Hot reloading based on remote registry.
- Running development and production environments.

## Setup

```shell
cd schema-registry-versioning
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

- `createSchemaVersion`
- `updateSchemaVersion`
- `createOrUpdateSchemaVersion`

Run a `createSchemaVersion` to build a release candidate:

```graphql
mutation {
  createSchemaVersion(name: "initial-release") {
    name
    version
    url
  }
}
```

The `name` argument is a GitHub branch name for this release candidate. Running that mutation, you should get a response that includes the `url` of a newly-created PR in the remote repo that contains the initial version of the schema. Check it out on GitHub, and **merge that PR**. If you didn't get a PR link, check your repo config.

### 3. Production server

Now that you've comitted an initial version of your schema to the registry repo, you're ready to start the production server. The initial commit must be made first so that your production server has a schema to startup with!

In a second terminal window:

```shell
yarn start-production
```

The following services are now available for interactive queries:

- **Production gateway:** http://localhost:4444/graphql
- **Development gateway:** http://localhost:4000/graphql
- _Inventory subservice_: http://localhost:4001/graphql
- _Products subservice_: http://localhost:4002/graphql

### 4. Hot-reload changes!

You'll notice that the production server is polling the registry repo for version changes. Let's give it some... Go into the Products subservice and add a new dummy field to the `Product` type:

```graphql
type Product {
  ...
  dummy: String
}
```

Now commit those changes to a release candidate:

```graphql
mutation {
  createOrUpdateSchemaVersion(name: "incremental-release") {
    name
    version
    url
  }
}
```

Try adding another dummy field to the schema, and run the above mutation again to add the additional change into the release. You can also make changes to both services and stage them together for release.

With all changes staged in your PR, watch the production gateway's terminal logs and then merge the PR. You should see the production gateway cutover during the next polling cycle (remember you'll still need to reload GraphiQL to see the revised schema in the UI):

```shell
version 1607572592741: 9d2a592013beddcca779e58d5f8fbb6930434ef4
version 1607572592741: 9d2a592013beddcca779e58d5f8fbb6930434ef4
VERSION UPDATE: d2709f88d9f60994d6d248902b8183534d4715a9
version 1607572603563: d2709f88d9f60994d6d248902b8183534d4715a9
```

## Summary

Tktk..
