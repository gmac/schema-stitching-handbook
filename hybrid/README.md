# Combine local and remote schema with hybrid http and websocket executor

This example explores basic techniques for combining a local schema and remote schema with a hybrid http and websocket executor together into one API. This covers most topics discussed in the [hybrid graphql over http and graphql over websocket documentation](https://the-guild.dev/graphql/tools/docs/remote-schemas#hybrid-graphql-over-http-and-graphql-over-websocket-graphql-ws).

**This example demonstrates:**

- Adding a locally-executable schema.
- Adding a remote schema with a hybrid executor.
- Authentication for subscriptions over web sockets.

## Setup

```shell
cd hybrid

yarn install
yarn start
```

The following services are available for interactive queries:

- **Stitched gateway:** http://localhost:4000/graphql
- _Products subservice_: http://localhost:4001/graphql

## Summary

### Queries

Visit the [stitched gateway](http://localhost:4000/graphql) and try running the following query:

```graphql
query {
  product(upc: "1") {
    upc
    name
  }
  errorCodes
}
```

The results of this query are live-proxied from the underlying subschemas by the stitched gateway:

- `product` comes from the remote Products server. This service is added into the stitched schema using introspection, i.e.: `introspectSchema` from the `@graphql-tools/wrap` package. Introspection is a tidy way to incorporate remote schemas, but be careful: not all GraphQL servers enable introspection, and those that do will not include custom directives.

- `errorCodes` comes from a locally-executable schema running on the gateway server itself. This schema is built using `makeExecutableSchema` from the `@graphql-tools/schema` package, and then stitched directly into the combined schema. Note that this still operates as a standalone schema instance that is proxied by the top-level gateway schema.

### Mutations

Mutations are virtually identical to queries, but with the expressed intent of modifying data on a remote server. They use a different GraphQL operation name ("mutation") to assure that they're not intermixed with queries. Try opening a new tab in the GraphQL Playground UI and running the following mutation:

```graphql
mutation {
  createProduct(name: "Soap", price: 1.00, upc: "3") {
    name
    price
    upc
  }
}
```

Like queries, all gateway mutation operations proxy a remote service using the `executor` function in subschema config.

### Subscriptions

Subscriptions pull live GraphQL updates over a websocket connection. Try opening another tab in the GraphQL Playground UI and running the following subscription:

```graphql
subscription {
  newProduct {
    name
    price
    upc
  }
}
```

## Authorization

Authorization is relatively straightforward in a stitched schema; the only trick is that the gateway schema must pass any user authorization information (generally just an `Authorization` header) through to the underlying subservices. This is a two step process:

1. Transfer authorization information from the gateway request into GraphQL context for the request:

```js
app.use(
  "/graphql",
  graphqlHTTP((req) => ({
    schema,
    context: {
      authHeader: req.headers.authorization,
    },
  }))
);
```

2. Add this authorization from context into the executor that builds subschema requests:

```js
// Handle queries and mutations
const httpExecutor = async (url, { document, variables, context }) => {
  const query = typeof document === "string" ? document : print(document);
  const fetchResult = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: context.authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  return fetchResult.json();
};

// Handle subscriptions
const wsExecutor = async (
  url,
  { document, variables, operationName, extensions, context }
) => {
  const subscriptionClient = createClient({
    url,
    webSocketImpl: WebSocket,
  });

  // Pass per request auth et al via extensions
  const ext = Object.assign(
    {
      customConnectionParams: {
        authorization: context.authHeader,
      },
    },
    extensions
  );
  ...
```

3. In practice, the subschema may need to do some mapping to pass through the auth properly

### Nestjs sample configuration to pass auth (via extensions) to subschema

Also see [Nestjs authentication over websockets documentation](https://docs.nestjs.com/graphql/subscriptions#authentication-over-websockets)

```ts
export const gql: ApolloDriverConfig = {
  driver: ApolloDriver,
  subscriptions: {
    "graphql-ws": {
      path: "/graphql",
      onSubscribe: (ctx: SubscriptionContext, message: SubscribeMessage) => {
        if (!_.isNil(message?.payload?.extensions?.customConnectionParams)) {
          (ctx as any).connectionParams =
            message.payload.extensions.customConnectionParams;
        }
        ctx.extra.message = message;
      },
    },
  },
  autoSchemaFile: "schema.gql",
  introspection: true,
  context: (context: QueryContext | SubscriptionContext): GqlContext => {
    if (isSubscriptionRequest(context)) {
      return {
        request: {
          headers: context.connectionParams, // Pass through auth details to use Nest mechanisms like guards
          body: { variables: context.extra.message?.payload?.variables },
        },
      };
    }
    return { request: context.req };
  },
};

function isSubscriptionRequest(
  context: QueryContext | SubscriptionContext
): context is SubscriptionContext {
  return !_.isNil((context as SubscriptionContext)?.extra?.socket);
}
```

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
