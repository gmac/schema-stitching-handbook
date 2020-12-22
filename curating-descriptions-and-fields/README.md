# Chapter 13 – Curating descriptions &amp; public fields

This example demonstrates curating element descriptions and public fields to ensure that the final stitched gateway is clean and well-documented. This includes some topics from the official [automatic merge documentation](https://www.graphql-tools.com/docs/stitch-combining-schemas#automatic-merge).

**This example demonstrates:**

- Selecting desired element descriptions from across subschemas.
- Filtering unwanted fields from the final schema.
- Serving public (filtered) and private (unfiltered) API versions.

## Setup

```shell
cd curating-descriptions-and-fields

yarn install
yarn start-gateway
```

The following services are available for interactive queries:

- **Public (filtered) gateway:** http://localhost:4000/public/graphql
- **Private (unfiltered) gateway:** http://localhost:4000/private/graphql

For simplicity, all subservices in this example are run locally by the gateway server. You could easily break out any subservice into a standalone remote server following the [combining local and remote schemas](../combining-local-and-remote-schemas) example.

## Summary

* Go to the [private gateway](http://localhost:4000/private/graphql) and open the documentation sidebar.
* Now go to the [public gateway](http://localhost:4000/public/graphql) and compare the documentation sidebar.

You'll notice that the private gateway includes all artifacts of our original stitched schema, including underscored service names such as `_users` and `_products`. By constrast, the public gateway has removed these. In both schemas, you'll see that elements include clean and concise descriptions.

### Selecting element descriptions

Type and field descriptions are used as documentation in frontend clients like GraphiQL, and may also be used while generating API documentation websites. As such, maintaining good quality element descriptions is quite important, yet becomes extremely difficult as overlapping types and fields are spread across services. You may want to devise an annotation system that denotes where the official descriptions for each type and field are written:

```graphql
# IGNORE - documented in Accounts service
type User @key(selectionSet: "{ id }") {
  # IGNORE - documented in Accounts service
  id: ID!
  """ Reviews written by this user. """
  reviews: [Review]
}
```

With these sorts of annotations in place, `typeMergingOptions` can define a programatic strategy for resolving type and field descriptions. For example, here we'll collect the first available description without an `IGNORE` prefix for each element across subschemas:

```js
function compactDescription(obj) {
  return obj.description ? obj.description.trim() : undefined;
}

function hasDescription(obj) {
  const description = compactDescription(obj);
  return !!description && !description.startsWith('IGNORE');
}

stitchSchemas({
  // ...
  typeMergingOptions: {
    typeDescriptionsMerger(candidates) {
      const candidate = candidates.find(({ type }) => hasDescription(type)) || candidates.pop();
      return compactDescription(candidate.type);
    },
    fieldConfigMerger(candidates) {
      const configs = candidates.map(c => c.fieldConfig);
      const config = configs.find(field => hasDescription(field)) || configs.pop();
      config.description = compactDescription(config);
      return config;
    },
    inputFieldConfigMerger(candidates) {
      const configs = candidates.map(c => c.inputFieldConfig);
      const config = configs.find(field => hasDescription(field)) || configs.pop();
      config.description = compactDescription(config);
      return config;
    },
  }
});
```

### Filtering public fields

The last step in composing a clean and elegant gateway schema is to remove internal implementation details that should not be made available to the general public. This is quite simple using `filterSchema` and `pruneSchema` helpers from GraphQL Tools utils:

```js
const { filterSchema, pruneSchema } = require('@graphql-tools/utils');

const privateSchema = makeGatewaySchema();
const publicSchema = pruneSchema(filterSchema({
  schema: privateSchema,
  rootFieldFilter: (type, fieldName) => !fieldName.startsWith('_'),
  fieldFilter: (type, fieldName) => !fieldName.startsWith('_'),
}));
```

Filtering a schema will remove unwanted elements, and pruning it will cleanup orphans. This results in two versions of our schema: the complete original schema, and the polished public schema. Each of these schemas may be served at their own endpoint, giving the public one polished experience, while the complete set of fields remains available for internal purposes at another location:

```js
const app = express();
app.use('/private/graphql', graphqlHTTP({ schema: privateSchema, graphiql: true }));
app.use('/public/graphql', graphqlHTTP({ schema: publicSchema, graphiql: true }));
```
