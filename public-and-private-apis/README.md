# Public &amp; private APIs

This example demonstrates filtering unwanted elements from the public schema, and serving public and private versions of the stitched schema for internal and external use.

**This example demonstrates:**

- Filtering unwanted fields from the final stitched schema.
- Serving public (filtered) and private (unfiltered) API versions.

## Setup

```shell
cd public-and-private-apis

yarn install
yarn start
```

The following services are available for interactive queries:

- **Public (filtered) gateway:** http://localhost:4000/public/graphql
- **Private (unfiltered) gateway:** http://localhost:4000/private/graphql

For simplicity, all subservices in this example are run locally by the gateway server. You could easily break out any subservice into a standalone remote server following the [combining local and remote schemas](../combining-local-and-remote-schemas) example.

## Summary

* Go to the [private gateway](http://localhost:4000/private/graphql) and open the documentation sidebar.
* Now go to the [public gateway](http://localhost:4000/public/graphql) and compare the documentation sidebar.

The last step in composing a clean and elegant gateway schema is to remove internal implementation details that should not be made available to the general public. You'll notice that the private gateway includes all artifacts of our original stitched schema, including underscored service names such as `_sdl`, `_users` and `_products`, and the underscored argument `_scope`. By constrast, the public gateway has removed these. This is quite simple using `filterSchema` and `pruneSchema` helpers from GraphQL Tools utils:

```js
const { filterSchema, pruneSchema } = require('@graphql-tools/utils');

const privateSchema = makeGatewaySchema();
const publicSchema = pruneSchema(filterSchema({
  schema: privateSchema,
  rootFieldFilter: (type, fieldName) => !fieldName.startsWith('_'),
  fieldFilter: (type, fieldName) => !fieldName.startsWith('_'),
  argumentFilter: (typeName, fieldName, argName) => !argName.startsWith('_'),
}));
```

Filtering a schema will remove unwanted elements, and pruning it will cleanup orphans. This results in two versions of our schema: the complete original schema, and the groomed public schema. Each of these schemas may be served at their own endpoint&mdash;this gives public consumers one API with access limitations, while the complete set of fields remain available for internal purposes at another location:

```js
const app = express();
app.use('/private/graphql', graphqlHTTP({ schema: privateSchema, graphiql: true }));
app.use('/public/graphql', graphqlHTTP({ schema: publicSchema, graphiql: true }));
```
