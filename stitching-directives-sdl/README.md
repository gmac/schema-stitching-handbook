# Chapter 9 – Stitching directives SDL

This example demonstrates the use of stitching directives to configure type merging via subschema SDLs. Shifting this configuration out of the gateway makes subschemas autonomous, and allows them to push their own configuration up to the gateway&mdash;enabling more sophisticated schema releases.

The `@graphql-tools/stitching-directives` package provides importable directives that can be used to annotate types and fields within subschemas, a validator to ensure the directives are used appropriately, and a configuration transformer that can be used on the gateway to convert the subschema directives into explicit configuration setting.

Note: the service setup in this example is based on the [official demonstration repository](https://github.com/apollographql/federation-demo) for
[Apollo Federation](https://www.apollographql.com/docs/federation/).

**This example demonstrates:**

- Use of the @key, @computed and @merge directives to specify type merging configuration.

## Setup

```shell
cd stitching-directives-sdl

yarn install
yarn start-services
```

The following services are available for interactive queries:

- **Stitched gateway:** http://localhost:4000/graphql
- _Accounts subservice_: http://localhost:4001/graphql
- _Inventory subservice_: http://localhost:4002/graphql
- _Products subservice_: http://localhost:4003/graphql
- _Reviews subservice_: http://localhost:4004/graphql

## Summary

While reviewing this example, it's important to remember that these SDL directives are just annotations for the static merge configuration that's been discussed throughout previous chapters. Anything expressed using SDL directives has an underlying static configuration setting. Let's look at the patterns used in this example and compare them to how they'd be written using static configuration.

### Single picked key

Open the Accounts schema and see the expression of a [single-record merge query](../type-merging-single-records):

```graphql
type User @key(selectionSet: "{ id }") {
  id: ID!
  name: String!
  username: String!
}

type Query {
  user(id: ID!): User @merge(keyField: "id")
}
```

This translates into the following configuration:

```js
merge: {
  User: {
    selectionSet: '{ id }'
    fieldName: 'user',
    args: (id) => ({ id }),
  }
}
```

Here the `@key` directive specified a base selection set for the merged type, and then the `@merge(keyField: "id")` directive marks the merger query&mdash;specifying that the `id` field should be picked from the original object as the query argument.

### Picked keys array

Next, open the Products schema and see the expression of an [array-batched merge query](../type-merging-arrays):

```graphql
type Product @key(selectionSet: "{ upc }") {
  upc: ID!
}

type Query {
  products(upcs: [ID!]!): [Product]! @merge(keyField: "upc")
}
```

This translates into the following configuration:

```js
merge: {
  Product: {
    selectionSet: '{ upc }'
    fieldName: 'products',
    key: ({ upc }) => upc,
    argsFromKeys: (upcs) => ({ upcs }),
  }
}
```

Again, the `@key` directive specified a base selection set for the merged type, and then the `@merge(keyField: "upc")` directive marks the merger array query&mdash;specifying that a `upc` field should be picked from each original object for the query argument array.

### Key object

```graphql
type Product @key(selectionSet: "{ upc }") {
  upc: ID!
  shippingEstimate: Int @computed(selectionSet: "{ price weight }")
}

scalar _Key

type Query {
  _products(keys: [_Key!]!): [Product]! @merge
}
```

```js
merge: {
  Product: {
    selectionSet: '{ upc }',
    computedFields: {
      shippingEstimate: { selectionSet: '{ price weight }' },
    },
    fieldName: '_products',
    key: ({ upc, price, weight }) => ({ __typename: 'Product', upc, price, weight }),
    argsFromKeys: (keys) => ({ keys }),
  }
}
```

```js
[
  { upc: '1', __typename: 'Product' },
  { upc: '2', __typename: 'Product' }
]

[
  { upc: '1', price: 899, weight: 100, __typename: 'Product' },
  { upc: '2', price: 1299, weight: 1000, __typename: 'Product' }
]
```

### Typed input

```graphql
type User @key(selectionSet: "{ id }") {
  id: ID!
}

input UserKey {
  id: ID!
}

type Query {
  _users(keys: [UserKey!]!): [User]! @merge
}
```

```js
merge: {
  User: {
    selectionSet: '{ id }',
    fieldName: '_users',
    key: ({ id }) => ({ id }),
    argsFromKeys: (keys) => ({ keys }),
  }
}
```

### Nested inputs

```graphql
type Product @key(selectionSet: "{ upc }") {
  upc: ID!
}

input ProductKey {
  upc: ID!
}

input ProductInput {
  keys: [ProductKey!]!
}

type Query {
  _products(input: ProductInput): [Product]! @merge(keyArg: "input.keys")
}
```