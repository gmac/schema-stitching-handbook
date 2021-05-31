# Combining local and remote schemas

**Watch the [chapter video](https://www.youtube.com/watch?v=8-mZqjgIdiI)**

[![Combining Schemas video](../images/video-player.png)](https://www.youtube.com/watch?v=8-mZqjgIdiI)

This example explores basic techniques for combining local and remote schemas together into one API. This covers most topics discussed in the [combining schemas documentation](https://www.graphql-tools.com/docs/stitch-combining-schemas).

**This example demonstrates:**

- Adding a locally-executable schema.
- Adding a remote schema, fetched via introspection.
- Adding a remote schema, fetched from a custom SDL service.
- Avoiding schema conflicts using transforms.
- Authorization headers.
- Basic error handling.

## Setup

```shell
cd combining-local-and-remote-schemas

yarn install
yarn start
```

The following services are available for interactive queries:

- **Stitched gateway:** http://localhost:4000/graphql
- _Products subservice_: http://localhost:4001/graphql
- _Storefronts subservice_: http://localhost:4002/graphql

## Summary

Visit the [stitched gateway](http://localhost:4000/graphql) and try running the following query:

```graphql
query {
  product(upc: "1") {
    upc
    name
  }
  rainforestProduct(upc: "2") {
    upc
    name
  }
  storefront(id: "2") {
    id
    name
  }
  errorCodes
  heartbeat
}
```

The results of this query are live-proxied from the underlying subschemas by the stitched gateway:

- `product` comes from the remote Products server. This service is added into the stitched schema using introspection, i.e.: `introspectSchema` from the `@graphql-tools/wrap` package. Introspection is a tidy way to incorporate remote schemas, but be careful: not all GraphQL servers enable introspection, and those that do will not include custom directives.

- `rainforestProduct` also comes from the remote Products server, although here we're pretending it's a third-party API (say, a product database named after a rainforest...). To avoid naming conflicts between our own Products schema and the Rainforest API schema, transforms are used to prefix the names of all types and fields that come from the Rainforest API.

- `storefront` comes from the remote Storefronts server. This service is added to the stitched schema by querying its SDL through its own GraphQL API (very meta). While this is less conventional than introspection, it works with introspection disabled and may include custom directives.

- `errorCodes` comes from a locally-executable schema running on the gateway server itself. This schema is built using `makeExecutableSchema` from the `@graphql-tools/schema` package, and then stitched directly into the combined schema. Note that this still operates as a standalone schema instance that is proxied by the top-level gateway schema.

- `heartbeat` comes from type definitions and resolvers built directly into the gateway proxy layer. This is the only field in this example that returns _directly_ from the gateway schema itself; everything else delegates to an underlying subschema instance.

## Authorization

Authorization is relatively straightforward in a stitched schema; the only trick is that the gateway schema must pass any user authorization information (generally just an `Authorization` header) through to the underlying subservices. This is a two step process:

1) Transfer authorization information from the gateway request into GraphQL context for the request:

```js
app.use('/graphql', graphqlHTTP((req) => ({
  schema,
  context: {
    authHeader: req.headers.authorization
  },
})));
```

2) Add this authorization from context into the executor that builds subschema requests:

```js
function makeRemoteExecutor(url) {
  return async ({ document, variables, context }) => {
    const query = typeof document === 'string' ? document : print(document);
    const fetchResult = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': context.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });
    return fetchResult.json();
  };
};
```

Also note that this example passes an `adminContext` into all introspection/SDL queries used to fetch remote subschemas. These requests are performed on behalf of the _gateway application_, not any specific user request. Therefore, this administrative context should provide app-to-app credentials on behalf of the gateway.

## Error handling

Try fetching a missing record, for example:

```graphql
query {
  product(upc: "99") {
    upc
    name
  }
}
```

You'll recieve a meaningful `NOT_FOUND` error rather than an uncontextualized null response. When building your subservices, always return meaningful errors that can flow through the stitched schema. This becomes particularily important once stitching begins to proxy records across document paths, at which time the confusion of uncontextualized failures will compound. Schema stitching errors are as good as the errors implemented by your subservices.
