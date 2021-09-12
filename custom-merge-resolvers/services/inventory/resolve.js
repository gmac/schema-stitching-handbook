const { Kind } = require('graphql');
const { batchDelegateToSchema } = require('@graphql-tools/batch-delegate');

module.exports = function createInventoryResolver(options) {
  return (obj, context, info, subschemaConfig, selectionSet, key) => {
    return batchDelegateToSchema({
      schema: subschemaConfig,
      context,
      info,
      key,
      operation: 'query',
      fieldName: options.fieldName,
      argsFromKeys: options.argsFromKeys,

      // The expected return type of this delegation...
      // matches what we're pointing the query at, not necessarily the merged type itself.
      // (stitching assumes we match the merged type by default)
      returnType: info.schema.getQueryType().toConfig().fields[options.fieldName].type,

      // Wrap merged type's selection set in an "items" field,
      // we'll access these merged objects through the intermediary collection type
      selectionSet: {
        kind: Kind.SELECTION_SET,
        selections: [{
          kind: Kind.FIELD,
          name: {
            kind: Kind.NAME,
            value: 'items',
          },
          selectionSet
        }]
      },

      // Collect results from the wrapping "items" field
      valuesFromResults: (result, keys) => result.items,

      // DO NOT run type merging again after this round of delegation
      // omitting this from a merged type resolver causes infinite recursion
      skipTypeMerging: true,
    });
  };
};
