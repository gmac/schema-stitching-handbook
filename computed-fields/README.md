# Chapter 7 – Computed fields

This example demonstrates the core techniques for passing field dependencies between subservices, covering most of the topics discussed in the official [computed fields documentation](https://www.graphql-tools.com/docs/stitch-type-merging#computed-fields).

**This example demonstrates:**

- Configuring computed fields.
- Sending complex inputs to subservices.
- Normalizing subservice deprecations in the gateway.

## Setup

```shell
cd computed-fields

yarn install
yarn start-gateway
```

The following service is available for interactive queries:

- **Stitched gateway:** http://localhost:4000/graphql

For simplicity, all subservices in this example are run locally by the gateway server. You could easily break out any subservice into a standalone remote server following the [combining local and remote schemas](../combining-local-and-remote-schemas) example.

## Summary

Visit the [stitched gateway](http://localhost:4000/graphql) and try running the following query:

```graphql
query {
  products(upcs: [1, 2, 3, 4]) {
    name
    price
    category {
      name
    }
    metadata {
      __typename
      name
      ...on GeoLocation {
        name
        lat
        lon
      }
      ...on SportsTeam {
        location {
          name
          lat
          lon
        }
      }
      ...on TelevisionSeries {
        season
      }
    }
  }
}
```

tktk
