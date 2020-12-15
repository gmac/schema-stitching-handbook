# Chapter 9 – Stitching directives SDL

**Watch the [Chapter 9 Video](https://www.youtube.com/watch?v=dE9cJsxOLeQ)**

[![Stitching Directives SDL](../images/video-player.png)](https://www.youtube.com/watch?v=dE9cJsxOLeQ)

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

First, try a query that includes data from all services:

```graphql
query {
  products(upcs: [1, 2]) {
    name
    price
    weight
    inStock
    shippingEstimate
    reviews {
      id
      body
      author {
        name
        username
        totalReviews
      }
      product {
        name
        price
      }
    }
  }
}
```

Neat, it works! All those merges were configured through schema SDL annotations. Let's review the patterns used in this example and compare them to their static configuration counterparts. Keep in mind: SDL directives are always just annotations for the static configuration that's been discussed throughout previous chapters.

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

Here the `@key` directive specifies a base selection set for the merged type, and the `@merge(keyField: "id")` directive marks a merger query&mdash;specifying that the `id` field should be picked from the original object as the query argument.

### Picked keys with additional arguments

Next, open the Products schema and see the expression of an [array-batched merge query](../type-merging-arrays):

```graphql
type Product @key(selectionSet: "{ upc }") {
  upc: ID!
}

type Query {
  products(upcs: [ID!]!, order: String): [Product]! @merge(
    keyField: "upc"
    keyArg: "upcs"
    additionalArgs: """ order: "price" """
  )
}
```

This translates into the following configuration:

```js
merge: {
  Product: {
    selectionSet: '{ upc }'
    fieldName: 'products',
    key: ({ upc }) => upc,
    argsFromKeys: (upcs) => ({ upcs, order: 'price' }),
  }
}
```

Again, the `@key` directive specifies a base selection set for the merged type, and the `@merge(keyField: "upc")` directive marks a merger array query&mdash;specifying that a `upc` field should be picked from each original object for the query argument array.

### Object keys

Now open the Inventory schema and see the expression of an object key, denoted by a generic scalar (here called `_Key`). In the absence of `keyField`, a generated key assumes the shape of a typed object like those sent to [federation services](../federation-services):

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

This translates into the following configuration:

```js
// assume "pick" works like the lodash method...
merge: {
  Product: {
    selectionSet: '{ upc }',
    computedFields: {
      shippingEstimate: { selectionSet: '{ price weight }' },
    },
    fieldName: '_products',
    key: (obj) => ({ __typename: 'Product', ...pick(obj, ['upc', 'price', 'weight']) }),
    argsFromKeys: (keys) => ({ keys }),
  }
}
```

The `_Key` scalar is an object with a `__typename` and all _utilized_ selectionSet fields on the type. For example, when the computed `shippingEstimate` field is requested, the resulting object keys look like:

```js
[
  { upc: '1', price: 899, weight: 100, __typename: 'Product' },
  { upc: '2', price: 1299, weight: 1000, __typename: 'Product' }
]
```

However, when `shippingEstimate` is NOT requested, the generated object keys will only contain fields from the base selectionSet:

```js
[
  { upc: '1', __typename: 'Product' },
  { upc: '2', __typename: 'Product' }
]
```

### Typed inputs

Similar to the [object keys](#object-keys) discussed above, an input object type may be used to constrain the specific fields included on a object key:

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

This translates into the following configuration:

```js
// assume "pick" works like the lodash method...
merge: {
  User: {
    selectionSet: '{ id }',
    fieldName: '_users',
    key: (obj) => pick(obj, ['id']),
    argsFromKeys: (keys) => ({ keys }),
  }
}
```

In this case, the generated object keys will contain nothing but utilized selectionSet fields that are whitelisted by the input type:

```js
[
  { id: '1' },
  { id: '2' }
]
```

### Nested inputs

A more advanced form of [typed input keys](#typed-inputs), this pattern uses the `keyArg` parameter to specify an input path at which to format the stitching query arguments:

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

### For demonstration only!

This example uses several needlessly complex key patterns for the sake of demonstration. For simplicity, it's generally best to use the basic picked key patterns whenever possible. Sending object keys is generally only necessary when implementing computed fields or communicating with federation services.
