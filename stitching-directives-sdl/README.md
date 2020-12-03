# Chapter 9 – Stitching directives SDL

This example demonstrates the use of stitching directives to specify type merging configuration. Moving service-specific configuration out of the gateway facilitates service setup automation, facilitating hot-reloading.

The `@graphql-tools/stitching-directives` package provides importable directives that can be used to annotate types and fields within subschemas, a validator to ensure the directives are used appropriately, and a configuration transformer that can be used on the gateway to convert the subschema directives into explicit configuration setting.

The gateway server can refresh the schema in response to "push" input of service changes via mutations as well as "pull" input of service health via subschema SDL polling.

Note: the service setup in this example is based on the [official demonstration repository](https://github.com/apollographql/federation-demo) for
[Apollo Federation](https://www.apollographql.com/docs/federation/).

**This example demonstrates:**

- Adding remote schemas, with typedefs and custom directives exposed via a custom root field.
- Use of the @key, @computed and @merge directives to specify type merging configuration.
- Use of a custom executor that times out a request after a pre-specified limit.
- Addition of custom queries/mutations on the gateway for listing/modifying the configured services.

## Setup

```shell
cd 06-hot-reloading-with-directives.

yarn install
yarn start-services
```

Then in a new terminal tab:

```shell
yarn start-gateway
```

The following services are available for interactive queries:

- **Stitched gateway:** http://localhost:4000/graphql
- _Accounts subservice_: http://localhost:4001/graphql
- _Inventory subservice_: http://localhost:4002/graphql
- _Products subservice_: http://localhost:4003/graphql
- _Reviews subservice_: http://localhost:4004/graphql

## Summary

tktk