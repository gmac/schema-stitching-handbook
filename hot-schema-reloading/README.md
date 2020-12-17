# Chapter 10 – Hot schema reloading

This example demonstrates reloading the combined gateway schema without restarting its server; a technique commonly known as a "hot" reload. This allows service schemas to be dyanmically added, removed, or updated in response to administrative actions or changes in service health.

**This example demonstrates:**

- Hot reload of the gateway schema (no server restart).
- Polling for remote subschema changes.
- Mutations for dynamically adding/removing subservices.
- Handling subservice request timeouts.

**Related examples:**

- See [versioning schema releases](../versioning-schema-releases) for more ideas on versioning and reloading.

## Setup

```shell
cd hot-schema-reloading

yarn install
yarn start-services
```

Then, in a separate terminal tab:

```shell
yarn start-gateway
```

The following services are available for interactive queries:

- **Stitched gateway:** http://localhost:4000/graphql
- _Inventory subservice_: http://localhost:4001/graphql
- _Products subservice_: http://localhost:4002/graphql

## Summary

Visit the [stitched gateway](http://localhost:4000/graphql) and try running the following query:

```graphql
query {
  endpoints {
    url
    sdl
  }
}
```

Then, try the following mutation:

```graphql
mutation {
  removeEndpoint(url: "http://localhost:4001/graphql") {
    success
  }
}
```

Refresh [gateway GraphiQL](http://localhost:4000/graphql) and see how the available types and root fields automatically adjust after the Reviews service has been removed from the gateway.

Then, try the following mutation:

```graphql
mutation {
  addEndpoint(url: "http://localhost:4001/graphql") {
    success
    endpoint {
      url
      sdl
    }
  }
}
```

Refresh [gateway GraphiQL](http://localhost:4000/graphql) and see how the available types and root fields have been restored.

### Without polling

Polling is by no means necessary to trigger gateway schema reloads. An even simpler solution is to setup a dedicated mutation that reloads the gateway schema, and then call it manually or in response to deployment hooks. Try running the `reloadAllEndpoints` mutation in this example to manually trigger a reload:

```graphql
mutation {
  reloadAllEndpoints {
    success
  }
}
```

See [versioning schema releases](../versioning-schema-releases) for a deeper exploration of hot-reloads that fetch from a versioned schema registry.

### Dropping services

This configuration can also handle dropping services when they go offline. To try it, run each service in thier own terminal window:

```shell
# first terminal:
yarn start-service-inventory

# second terminal:
yarn start-service-products

# third terminal:
yarn start-gateway
```

Now try stopping the Products service by exiting its program (`CTRL+C`). Refresh [gateway GraphiQL](http://localhost:4000/graphql) and notice that the schema has responded to the change automatically.
