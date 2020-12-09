const { buildSchema } = require('graphql');
const { stitchSchemas } = require('@graphql-tools/stitch');
const { stitchingDirectives } = require('@graphql-tools/stitching-directives');
const makeRemoteExecutor = require('../../lib/make_remote_executor');
const readFileSync = require('../../lib/read_file_sync');

const { stitchingDirectivesTypeDefs, stitchingDirectivesTransformer } = stitchingDirectives();

let intervalId, schema, endpoints = [];

async function reloadEndpointsAndSchema() {
  console.log('fetching schema...');

  schema = stitchSchemas({
    subschemaConfigTransforms: [stitchingDirectivesTransformer],
    subschemas: endpoints.map(({ url, sdl }) => ({
      schema: buildSchema(sdl),
      executor: makeRemoteExecutorWithTimeout(url, 5000),
      batch: true,
    })),
    typeDefs,
    resolvers,
  });

  console.log('refresh complete.');
  return schema;
}

module.exports = {
  load: reloadEndpointsAndSchema,

  get schema() {
    return schema;
  },

  autoRefresh(interval=5000) {
    this.stopAutoRefresh();
    intervalId = setTimeout(async () => {
      await reloadEndpointsAndSchema();
      intervalId = null;
      this.autoRefresh(interval);
    }, interval);
  },

  stopAutoRefresh() {
    if (intervalId != null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }
};
