const makeRemoteExecutor = require('./make_remote_executor');

module.exports = class SchemaLoader {
  constructor({ buildSchema, endpoints }) {
    this.buildSchema = buildSchema;
    this.endpoints = endpoints;
    this.loadedEndpoints = [];
    this.schema = null;
  }

  async reload() {
    const loadedEndpoints = await Promise.all(this.endpoints.map(async (url) => {
      try {
        const fetcher = makeRemoteExecutor(url, { timeout: 200 });
        const { data } = await fetcher({ document: '{ _sdl }' });
        return {
          url,
          sdl: data._sdl,
        };
      } catch (err) {
        // drop the schema, or return the last cached version, etc...
        return null;
      }
    }));

    this.loadedEndpoints = loadedEndpoints.filter(Boolean);
    this.schema = this.buildSchema(this.loadedEndpoints);
    console.log(`gateway reload ${Date.now()}, endpoints: ${this.loadedEndpoints.length}`);
    return this.schema;
  }

  autoRefresh(interval=3000) {
    this.stopAutoRefresh();
    this.intervalId = setTimeout(async () => {
      await this.reload();
      this.intervalId = null;
      this.autoRefresh(interval);
    }, interval);
  }

  stopAutoRefresh() {
    if (this.intervalId != null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
};
