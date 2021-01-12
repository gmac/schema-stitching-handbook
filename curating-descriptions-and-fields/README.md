# Curating descriptions &amp; public fields

This example demonstrates curating element descriptions and public fields to ensure that the final stitched gateway is clean and well-documented. This includes some topics from the official [automatic merge documentation](https://www.graphql-tools.com/docs/stitch-combining-schemas#automatic-merge).

**This example demonstrates:**

- Selecting desired element descriptions from across subschemas.
- Filtering unwanted fields from the final schema.
- Serving public (filtered) and private (unfiltered) API versions.

## Setup

```shell
cd curating-descriptions-and-fields

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

You'll notice that the private gateway includes all artifacts of our original stitched schema, including underscored service names such as `_users` and `_products`. By constrast, the public gateway has removed these. In both schemas, you'll see that elements include clean and concise descriptions.

### Selecting element descriptions

Type and field descriptions are used as documentation in frontend clients like GraphiQL, and may also be used while generating API documentation websites. As such, maintaining good quality element descriptions is quite important, yet becomes extremely difficult as overlapping types and fields are spread across services maintained by different teams. How do we ensure that a robust "official" description in one service is not overridden by a shallow description added elsewhere in the future?

One approach is to concatenate descriptions from across services. While this works, it often makes for a repetitive and/or disorganized aggregate. A better solution may be to annotate around a canonical description, for example:

```graphql
# IGNORE - documented in Accounts service
type User @key(selectionSet: "{ id }") {
  # IGNORE - documented in Accounts service
  id: ID!
  "Reviews written by this user."
  reviews: [Review]
}
```

While these annotations are unsightly at the subservice level, they solve several problems:

- Types and fields are identified as _deliberately undocumented_ so that they do not inadvertantly introduce a competing description in the future.
- The location of canonical descriptions are observed throughout the service architecture for all teams to reference. Realistically, canonical descriptions probably won't change all that often.

With these sorts of annotations in place, `typeMergingOptions` can define a programatic strategy for resolving type and field descriptions. For example, here we'll collect the first available description without an `IGNORE` prefix for each element across subschemas. There are many ways this basic formula can be adapted to an organization's specific needs:

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
  argumentFilter: (typeName, fieldName, argName) => !argName.startsWith('_'),
}));
```

Filtering a schema will remove unwanted elements, and pruning it will cleanup orphans. This results in two versions of our schema: the complete original schema, and the polished public schema. Each of these schemas may be served at their own endpoint&mdash;this gives public consumers one API with access limitations, while the complete set of fields remain available for internal purposes at another location:

```js
const app = express();
app.use('/private/graphql', graphqlHTTP({ schema: privateSchema, graphiql: true }));
app.use('/public/graphql', graphqlHTTP({ schema: publicSchema, graphiql: true }));
```
