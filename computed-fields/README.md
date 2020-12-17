# Chapter 7 – Computed fields

This example demonstrates the core techniques for passing field dependencies between subservices, covering most of the topics discussed in the official [computed fields documentation](https://www.graphql-tools.com/docs/stitch-type-merging#computed-fields).

Computed fields are tricky because they involve selecting data from various services, and then sending that data as input into another service that internally computes data upon it. This is considerably more complex than simply picking an ID scalar from one record and handing that to another service for a matching record. In the computed fields scenario, service A literally cannot resolve its promised schema without input from service B. Because of this complexity, schema sitching generally discourages the use of computed fields outside of exceptional circumstances. There are generally simpler ways to structure common cross-service associations.

However, when you do find yourself saying, "I wish my record associations were structured differently here...", that's frequently a lead-in to a legitimate case for a computed field. Computed fields allow foreign keys to be inverted, so a key in one service that lacks type information can be sent to its origin to be matched. This is not a simple or elegant pattern, but may work around difficult situations that would otherwise require unrealistic changes (such as moving a database table to a different application).

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
