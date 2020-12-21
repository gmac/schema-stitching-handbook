const { buildSchema } = require('graphql');
const { stitchSchemas } = require('@graphql-tools/stitch');
const { stitchingDirectives } = require('@graphql-tools/stitching-directives');
const { stitchingDirectivesTransformer } = stitchingDirectives();
const makeRemoteExecutor = require('./make_remote_executor');
const readFileSync = require('./read_file_sync');
const config = require('../config.json');

function buildSubschemaConfigs() {
  return Object.entries(config.services).reduce((memo, [name, settings]) => {
    memo[name] = {
      schema: buildSchema(readFileSync(__dirname, `../remote_schemas/${name}.graphql`)),
      executor: makeRemoteExecutor(settings.url),
      batch: true,
    };
    return memo;
  }, {});
}

function buildGatewaySchema(subschemasByName) {
  return stitchSchemas({
    subschemaConfigTransforms: [stitchingDirectivesTransformer],
    subschemas: Object.values(subschemasByName),
  });
}

module.exports = {
  buildSubschemaConfigs,
  buildGatewaySchema,
};
