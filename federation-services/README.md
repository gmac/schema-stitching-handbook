# Federation services

This example demonstrates the integration of [Apollo Federation services](https://www.apollographql.com/docs/federation/implementing-services/) into a stitched schema.

> ⚠️ NOTE: integration with Apollo Federation and its evolving roadmap is NOT a core concern of GraphQL Tools Schema Stitching. While the two systems have plenty of similarities and you can pull many strings to make them talk to each other, there is no formal contract that guarentees their interoperability. The following guide outlines commonalities between the two systems. Buyer beware that you're assuming your own testing and maintenance overhead if you choose to couple these systems in a production environment. Also note that the [Federation roadmap](https://www.youtube.com/watch?v=MvHzOwdLb_o) outlines several prospective features that will tightly-couple subservices with a proprietary Apollo Gateway implementation.

As you get the hang of schema stitching, you may find that Federation services are fairly complex for what they do. The `buildFederatedSchema` method from the `@apollo/federation` package creates a nuanced GraphQL resource that does not guarentee itself to be independently consistent, but plugs seamlessly into a greater automation package. By comparison, stitching encourages services to be independently valid and self-contained GraphQL resources, which makes them quite primitive and durable. While federation automates service bindings at the cost of tightly-coupled complexity, stitching embraces loosely-coupled bindings at the cost of manual setup. The merits of each strategy are likely to be a deciding factor for developers selecting a platform. Stitching is a _library_ used to build a _framework_ like Federation.

Stitching is less opinionated than Federation, and is made considerably simpler without the complexity added by `buildFederatedSchema`. However, when integrating with existing servers or in the process of a migration, nothing says you can't incorporate your existing federation resources into a stitched gateway going through the [federation `_entities` query](https://www.apollographql.com/docs/federation/federation-spec/#query_service) – which is fundamentally just a GraphQL service.

**This example demonstrates:**

- Integrating Apollo Federation services into a stitched schema.
- Fetching and parsing Federation SDLs.

## Setup

```shell
cd federation-services

yarn install
yarn start
```

The following services are available for interactive queries:

- **Stitched gateway:** http://localhost:4000/graphql
- _Products subservice_: http://localhost:4001/graphql
- _Reviews subservice_: http://localhost:4002/graphql
- _Users subservice_: http://localhost:4003/graphql

This example is based on the [Federation intro example](https://www.apollographql.com/docs/federation/#concern-based-separation).

## Summary

Ever wonder what Federation is doing under the hood? Visit the [products service](http://localhost:4001/graphql) and check out some `User` objects:

```graphql
query {
  _entities(representations: [
    { __typename: "User", id: "1" },
    { __typename: "User", id: "2" },
    { __typename: "User", id: "3" }
  ]) {
    ...on User {
      id
      recentPurchases {
        upc
        name
        price
      }
    }
  }
}
```

A federation service automatically configures an `_entities` query that recieves typed keys (i.e.: objects with a `__typename`), and returns abstract `_Entity` objects that may assume the shape of any type in the service. [Apollo Gateway](https://www.npmjs.com/package/@apollo/gateway) then automates the exchange of typed keys for typed results, all going through the dedicated `_entities` protocol in each subservice. Stitching can also integrate with this `_entities` query by sending it properly formatted keys.

Now [go to the gateway](http://localhost:4001/graphql) and check out the stitched results:

```graphql
query {
  user(id: "1") {
    username
    recentPurchases {
      upc
      name
    }
    reviews {
      body
      author {
        id
        username
      }
      product {
        upc
        name
        acceptsNewReviews
      }
    }
  }
}
```

The stitched gateway has loaded all federation SDLs, [converted them into stitching SDLs](https://github.com/gmac/federation-to-stitching-sdl), and then integrates them like any other GraphQL service with types merged through their `_entities` query.

### Adapting Federation services

Federation and Stitching use fundamentally similar patterns to combine underlying subservices (in fact, both tools have shared origins in [Apollo Stitching](https://www.apollographql.com/docs/federation/migrating-from-stitching/)). However, their specific implementations have an important differentiator:

- **Apollo Federation uses a _centralized_ approach**, where all types have a single "origin" service (i.e.: where the unextended type definition is). Querying for a type builds from its origin service.
- **Stitching uses a _decentralized_ approach**, where any service may equally originate any type. Regardless of where a typed object is first represented, that original object is filled in with missing details from other services.

How each system handles origins informs how a federation service gets translated into a stitched subschema:

1. All types with a `@key` directive become merged types; the key fields go into `selectionSet`.
1. All fields with a `@requires` directive are made into computed fields. Computed fields are slightly more robust than their federation counterparts because they may resolve dependencies from any number of services.
1. All fields with an `@external` directive are removed _unless they are part of the `@key`_. Stitching expects schemas to only publish fields that they actually have data for. This is considerably simpler than the federation approach where services may be responsible for data they don't have.
1. By eliminating the indirection of `@external` fields, the `@provides` directive is no longer necessary. The Stitching query planner can automate the optimial selection of as many fields as possible from as few services as possible.

### SDL integration

The simplest way to make the above adaptions is to translate a Federation SDL string into a Stitching SDL string, which can be done using the [`federation-to-stitching-sdl`](https://github.com/gmac/federation-to-stitching-sdl) package. A federation service's SDL can be obtained through its `_service` API:

```graphql
query {
  _service {
    sdl
  }
}
```

Once fetched, it can be translated into a Stitching SDL and then built into a stitched schema:

```js
const { buildSchema } = require('graphql');
const { stitchingDirectives } = require('@graphql-tools/stitching-directives');
const federationToStitchingSDL = require('federation-to-stitching-sdl');
const makeRemoteExecutor = require('./lib/make_remote_executor');
const stitchingConfig = stitchingDirectives();

const executor = makeRemoteExecutor('http://localhost:4001/graphql');
const federationSDL = await executor({ document: '{ _service { sdl } }' });
const stitchingSDL = federationToStitchingSDL(federationSDL, stitchingConfig);

const gatewaySchema = stitchSchemas({
  subschemaConfigTransforms: [stitchingConfig.stitchingDirectivesTransformer],
  subschemas: [{
    schema: buildSchema(stitchingSDL),
    executor
  }]
});
```

### Static config

Written as static subservice configuration, a federation service merges types within a stitched gateway using the following:

```js
const { pick } = require('lodash');

const gatewaySchema = stitchSchemas({
  subschemas: [{
    schema: buildSchema(stitchingSDL),
    merge: {
      Product: {
        selectionSet: '{ id }',
        fields: {
          shippingEstimate: { selectionSet: '{ price weight }', computed: true }
        },
        fieldName: '_entities',
        key: (originObj) => ({ __typename: 'Product', ...pick(originObj, ['id', 'price', 'weight']) }),
        argsFromKeys: (representations) => ({ representations }),
      }
    }
  }]
});
```
