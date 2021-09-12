const { Kind, parse } = require('graphql');
const { delegateToSchema } = require('@graphql-tools/delegate');
const DataLoader = require('dataloader');

const cache = new WeakMap();

module.exports = function createPricingResolver(options) {
  return (obj, context, info, subschemaConfig, selectionSet, key) => {
    let loader = cache.get(selectionSet);

    if (loader == null) {
      loader = new DataLoader(async (keys) => {
        const result = await delegateToSchema({
          schema: subschemaConfig,
          context,
          info,
          operation: 'query',
          fieldName: 'pricing',
          args: () => ({}),

          // read return type of root target from intended schema
          returnType: info.schema.getQueryType().toConfig().fields['pricing'].type,

          // Wrap merged type selection set in a query path selection
          selectionSet: {
            kind: Kind.SELECTION_SET,
            selections: [{
              kind: Kind.FIELD,
              name: {
                kind: Kind.NAME,
                value: 'products',
              },
              arguments: [{
                kind: Kind.ARGUMENT,
                name: {
                  kind: Kind.NAME,
                  value: 'ids',
                },
                value: {
                  kind: Kind.LIST,
                  values: keys.map(key => ({
                    kind: Kind.STRING,
                    value: String(key),
                    block: false,
                  }))
                }
              }],
              selectionSet
            }]
          },

          // DO NOT run type merging again after this round of delegation
          // omitting this from a merged type resolver causes infinite recursion
          skipTypeMerging: true,
        });

        return result.products;
      });

      cache.set(selectionSet, loader);
    }

    return loader.load(key);
  };
};
