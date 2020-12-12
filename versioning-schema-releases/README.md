# Chapter 11 – Versioning schema releases

This example demonstrates using a GitHub repo as a central registry that coordinates the versioning and release of subschemas. Similar to the goals of [managed federation](https://www.apollographql.com/docs/federation/managed-federation/overview/), a central registry allows subschemas to be precomposed and tested together before releasing into production. This isn't terribly difficult to setup&mdash;a simple Git repo with some light code wrappings can generally get the job done as well or better than [hosted services](https://www.apollographql.com/docs/studio/getting-started/#1-create-your-account). Using a Git repo actually offers several distinct advantages:

- Multiple subservice schemas may be composed on a branch together and released at once, affording the opportunity for hard schema cutovers across multiple services.
- Comprehensive test suites may be written to assure the integrity of the composed gateway schema, and can easily run using [continuous integration services](https://docs.github.com/en/free-pro-team@latest/actions). In fact, versioning subschemas _in your gateway app's repo_ allows CI to run tests using both your release candidate schemas and your actual gateway server code.
- Git is a defacto-standard tool with numerous frontends available, and can be adapted to meet virtually any versioning and deployment need.

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

This example uses live integration with the GitHub API. You'll need to setup a repo:

1. Create a [new GitHub repo](https://github.com/new) _with a README_ (or other default file, so long as the repo is not empty). Public or private doesn't matter.
2. Create a [personal access token](https://docs.github.com/en/free-pro-team@latest/github/authenticating-to-github/creating-a-personal-access-token) with `repo`-only access.
3. Make a copy of the provided `/repo.template.json` file and rename it `/repo.json`. This copy will contain secrets (so is git-ignored). Add the following:
  - `owner`: your GitHub username.
  - `repo`: name of the new registry repo.
  - `token`: your personal access token.
  - `mainBranch`: name of the default (master) branch in your repo; GitHub defaults to `main`, but you can customize that.
  - `registryPath`: a directory path to where versioned schemas will be placed in the repo.

### 2. Development server &amp; initial schema commit

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
- `mergeSchemaReleaseBranch`

Run `createSchemaReleaseBranch` to build a release candidate:

```graphql
mutation {
  createSchemaReleaseBranch(name: "initial-release") {
    name
    sha
    url
    pullRequestUrl
  }
}
```

The `name` argument is a GitHub branch name for this release candidate. Running that mutation, you should get a response that includes the `pullRequestUrl` of a newly-created PR in the remote repo containing the initial schema version (if you don't get a link, check your repo config). Review the PR on GitHub, then **merge it!** You can also get fancy and merge it using a local mutation:

```graphql
mutation {
  mergeSchemaReleaseBranch(name: "initial-release") {
    name
    sha
  }
}
```

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

You'll notice that the production server is polling the registry repo for version changes. Let's give it something to find... go into the Products subservice and add a new dummy field to the `Product` type:

```graphql
type Product {
  ...
  dummy: String
}
```

Now commit those changes to a release branch:

```graphql
mutation {
  createOrUpdateSchemaReleaseBranch(name: "incremental-release") {
    name
    sha
    url
    pullRequestUrl
  }
}
```

Try adding another dummy field to the schema, and then run the above mutation again to add the additional change into the release branch. You can even make changes to both subservices and stage them together for release.

With all changes staged in your PR, watch the `production` gateway terminal logs and then merge the release PR (via GitHub UI or `mergeSchemaReleaseBranch`). You should see the production gateway cutover on the next polling cycle (remember, you'll still need to reload GraphiQL to bring the revised schema into the UI):

```shell
version 1607572592741: 9d2a592013beddcca779e58d5f8fbb6930434ef4
version 1607572592741: 9d2a592013beddcca779e58d5f8fbb6930434ef4
VERSION UPDATE: d2709f88d9f60994d6d248902b8183534d4715a9
version 1607572603563: d2709f88d9f60994d6d248902b8183534d4715a9
```

## Summary

There's [a lot to be said](https://www.apollographql.com/docs/federation/managed-federation/advanced-topics/) about schema versioning and release strategies. Let's be (fairly) brief and distill a few key points:

### Post-deploy hooks don't fix everything

Say you dilligently call `mergeSchemaReleaseBranch` (or a similar release command) from your subservice post-deploy hook... Neat! However, there will still be latency between that release and the next gateway polling interval. This latency compounds when deploying many instances of a subservice app and the post-deploy hook doesn't fire until all instances are running. Long story short: there will always be latancy.

Therefore, you may find that post-deploy hooks aren't a magic bullet for orchestrating seamless schema rollouts. Whether the revised gateway schema rolls out in seconds (thanks to post-deploy hooks), or minutes (until you press a merge button by hand), either scenario presents a window in which conflicting schema errors may occur. That said, releases really boil down to either being _non-breaking_ or _breaking_; the later of which should probably be done during a maintenance window.

Now, that's not to say that post-deploy hooks aren't a worthwhile _convenience_. It's just important to know what problem they are actually solving. The best release strategies will always deploy new subservice schemas quietly behind the gateway proxy layer in a way that activates new features without breaking existing ones. Following this pattern, it doesn't really matter if a gateway schema rollout takes seconds or minutes after a subservice deploy. This is also where staging changes to multiple subschemas and releasing them together as a single gateway cutover becomes very useful.

### Versioning subschemas with gateway code is a neat idea

Stitching offers a rich toolkit of features with which to assemble your combined gateway schema. This extensibility is a great feature of stitching, but also means you should tailor your own test coverage to the design of your application. Among the most effective ways to do this is to version your subschemas and gateway code in proximity of one another using a shared repo or submodules. This allows your schemas to run integration tests using your real application code, versus relying on a representational gateway test harness.

Also as the size of your service cluster grows, you'll inevitably want to run development environments with only select subservices running. As long as your development gateway has easy access to the schema registry, it can always build its full schema and run with missing or mocked subservices (requests to missing subservices will simply fail). The example code in this chapter purposely keeps to basic design patterns that may be adapted to more specific needs.
