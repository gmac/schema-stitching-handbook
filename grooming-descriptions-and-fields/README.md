# Chapter 13 – Grooming descriptions &amp; public fields

This example demonstrates grooming element descriptions and visible fields to ensure that the final stitched gateway is clean and well-documented.

**This example demonstrates:**

- Selecting desired element descriptions from across subschemas.
- Filtering unwanted fields from the final schema.
- Serving public (filtered) and private (unfiltered) API versions.

## Setup

```shell
cd grooming-descriptions-and-fields

yarn install
yarn start-gateway
```

The following services are available for interactive queries:

- **Public (filtered) gateway:** http://localhost:4000/public/graphql
- **Private (unfiltered) gateway:** http://localhost:4000/private/graphql

For simplicity, all subservices in this example are run locally by the gateway server. You could easily break out any subservice into a standalone remote server following the [combining local and remote schemas](../combining-local-and-remote-schemas) example.

## Summary

tktk
