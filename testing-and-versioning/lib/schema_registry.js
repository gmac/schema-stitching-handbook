const GitHubClient = require('./make_remote_executor');
const makeRemoteExecutor = require('./make_remote_executor');

const FETCH_REGISTRY_VERSION = `query FetchRegistryVersion($owner:String!, $repo:String!, $path:String!) {
  repository(owner:$owner, name:$repo) {
    object(expression:$path) { oid }
  }
}`;

const FETCH_REGISTRY_FILES = `query FetchRegistryFiles($owner:String!, $repo:String!, $path:String!) {
  repository(owner:$owner, name:$repo) {
    object(expression:$path) {
      oid
      ...on Tree {
        entries {
          name
          object
          ... on Blob {
            text
          }
        }
      }
    }
  }
}`;

async function fetchLocalSDL(executor) {
  return new Promise((resolve, reject) => {
    async function next(attempt=1) {
      try {
        const { data } = await executor({ document: '{ _sdl }' });
        resolve(data._sdl);
      } catch (err) {
        if (attempt >= 5) reject(err);
        setTimeout(() => next(attempt+1), 150);
      }
    }
    next();
  });
}

module.exports = class SchemaRegistry {
  constructor(config) {
    this.env = config.env;
    this.client = new GitHubClient(config.github);
    this.registryPath = config.github.registryPath;
    this.registryVersion = null;
    this.schema = null;
    this.endpoints = [];
    this.services = config.services;
    this.buildSchema = config.buildSchema;
  }

  async createRelease(branchName, message='create release candidate') {
    const branch = await this.client.createHead(branchName);
    const tree = await this.client.createTree(branch.object.sha, this.currentFiles());
    const commit = await this.client.createCommit(branch.object.sha, tree.sha, message);
    const head = await this.client.updateHead(branchName, commit.sha);
    await this.client.createPullRequest(branchName);
    return branchName;
  }

  async updateRelease(branchName, message='update release candidate') {
    const head = await this.client.getHead(branchName);
    const tree = await this.client.createTree(head.object.sha, this.currentFiles());
    const commit = await this.client.createCommit(head.object.sha, tree.sha, message);
    await this.client.updateHead(branchName, commit.sha);
    return branchName;
  }

  async createOrUpdateRelease(branchName, message) {
    let branch, created = false;
    try {
      branch = await this.client.createHead(branchName);
      await this.client.createPullRequest(branchName);
      message = message || 'create release candidate';
      created = true;
    } catch (err) {
      if (err.status !== 422) throw err;
      branch = await this.client.getHead(branchName);
      message = message || 'update release candidate';
    }
    const tree = await this.client.createTree(branch.object.sha, this.currentFiles());
    const commit = await this.client.createCommit(branch.object.sha, tree.sha, message);
    const head = this.client.updateHead(branchName, commit.sha);
    if (created) await this.client.createPullRequest(branchName);
    return branchName;
  }

  currentFiles() {
    return this.endpoints.map(({ name, url, sdl }) => ({
      path: `${this.registryPath}/${name}.graphql`,
      contents: `# $url ${url.production || url.development}\n\n${sdl}`,
      mode: '100644',
      type: 'blob',
    }));
  }

  async getRegistryVersion() {
    const { data } = await this.client.graphql({
      document: FETCH_REGISTRY_VERSION,
      variables: {
        owner: this.client.owner,
        repo: this.client.repo,
        path: `${this.client.mainBranch}:${this.registryPath}`,
      }
    });

    return data.repository.object.oid;
  }

  async loadRegistryEndpoints() {
    const urlPattern = /# \$url ([^\n]+)\n/;
    const { data } = await this.client.graphql({
      document: FETCH_REGISTRY_FILES,
      variables: {
        owner: this.client.owner,
        repo: this.client.repo,
        path: `${this.client.mainBranch}:${this.registryPath}`,
      }
    });

    this.registryVersion = data.repository.object.oid;

    return data.repository.object.entries.map(entry => ({
      name: entry.name.replace(/\.graphql$/, ''),
      url: entry.object.text.match(urlPattern)[1],
      sdl: entry.object.text.replace(urlPattern, ''),
    }));
  }

  async loadLocalEndpoints() {
    return Promise.all(this.services.map(async (service) => {
      const url = service.url[this.env];
      const sdl = await fetchLocalSDL(makeRemoteExecutor(url));
      return { name: service.name, url, sdl };
    }));
  }

  async load() {
    if (this.env === 'production' && (!this.registryVersion || this.registryVersion !== await this.getRegistryVersion())) {
      this.endpoints = await this.loadRegistryEndpoints();
    } else {
      this.endpoints = await this.loadLocalEndpoints();
    }
    this.schema = await this.buildSchema(this.endpoints);
    return this.schema;
  }

  autoRefresh(interval=5000) {
    this.stopAutoRefresh();
    this.intervalId = setTimeout(async () => {
      await this.load();
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
