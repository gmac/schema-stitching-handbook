const { buildSchema } = require('graphql');
const { stitchSchemas } = require('@graphql-tools/stitch');
const { stitchingDirectives } = require('@graphql-tools/stitching-directives');
const makeRemoteExecutorWithTimeout = require('../../lib/make_remote_executor_with_timeout');
const readFileSync = require('../../lib/read_file_sync');

const { stitchingDirectivesTypeDefs, stitchingDirectivesTransformer } = stitchingDirectives();

const typeDefs = `
  ${stitchingDirectivesTypeDefs}
  ${readFileSync(__dirname, './schema.graphql')}
`;

module.exports = function makeGatewaySchemaLoader(urls) {
  if (!Array.isArray(urls)) {
    throw 'Must provide an array of urls';
  }

  let intervalId, endpoints = [];

  const schema = Object.create(null);
  const resolvers = {
    Query: {
      allEndpoints: () => endpoints,
      endpoints: (_root, { urls }) => urls.map(url => endpoints.find(e => e.url === url) || new NotFoundError()),
    },
    Mutation: {
      addEndpoint: async (_root, { url }) => {
        let success = false;
        if (!urls.includes(url)) {
          urls.push(url);
          await reloadEndpointsAndSchema();
          success = true;
        }
        return { success };
      },
      removeEndpoint: async (_root, { url }) => {
        let success = false;
        const index = urls.indexOf(url);
        if (index > -1) {
          urls.splice(index, 1);
          await reloadEndpointsAndSchema();
          success = true;
        }
        return { success };
      },
    },
  };

  async function reloadEndpointsAndSchema() {
    console.log('fetching schema...');

    const fetchedEndpoints = await Promise.all(urls.map(async (url) => {
      const fetcher = makeRemoteExecutorWithTimeout(url, 200);
      const result = await fetcher({ document: '{ _sdl }' });

      if (result instanceof Error) {
        console.log(`Failed to retrieve SDL from "${url}":\n ${result.message}`);
        // or raise error, or use last cached schema, etc...
        return null;
      }

      return { url, sdl: result.data._sdl };
    }));

    endpoints = fetchedEndpoints.filter(Boolean);
    Object.setPrototypeOf(schema, stitchSchemas({
      subschemaConfigTransforms: [stitchingDirectivesTransformer],
      subschemas: endpoints.map(({ url, sdl }) => ({
        schema: buildSchema(sdl),
        executor: makeRemoteExecutorWithTimeout(url, 5000),
        batch: true,
      })),
      typeDefs,
      resolvers,
    }));

    console.log('refresh complete.');
    return schema;
  }

  return {
    load: reloadEndpointsAndSchema,

    autoRefresh(interval=10000) {
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
};
