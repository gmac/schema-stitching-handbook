const GitHubClient = require('./github_client');
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
        setTimeout(() => next(attempt+1), 500);
      }
    }
    next();
  });
}

module.exports = class SchemaRegistry {
  constructor(config) {
    this.env = config.env;
    this.client = new GitHubClient(config.github);
    this.endpoints = config.endpoints;
    this.buildSchema = config.buildSchema;
    this.registryPath = config.github.registryPath;
    this.registryVersion = null;
    this.schema = null;
    this.services = [];
  }

  async createRelease(branchName, message='create release candidate') {
    const branch = await this.client.createHead(branchName);
    const tree = await this.client.createTree(branch.object.sha, this.treeFiles());
    const commit = await this.client.createCommit(branch.object.sha, tree.sha, message);
    const head = await this.client.updateHead(branchName, commit.sha);
    const pr = await this.client.createPullRequest(branchName);
    return {
      name: branchName,
      version: commit.sha,
      url: pr.html_url,
    };
  }

  async updateRelease(branchName, message='update release candidate') {
    const branch = await this.client.getHead(branchName);
    const tree = await this.client.createTree(branch.object.sha, this.treeFiles());
    const commit = await this.client.createCommit(branch.object.sha, tree.sha, message);
    await this.client.updateHead(branchName, commit.sha);
    return {
      name: branchName,
      version: commit.sha,
      url: commit.html_url,
    };
  }

  async createOrUpdateRelease(branchName, message) {
    let branch, created = false;
    try {
      branch = await this.client.createHead(branchName);
      message = message || 'create release candidate';
      created = true;
    } catch (err) {
      if (err.status !== 422) throw err;
      branch = await this.client.getHead(branchName);
      message = message || 'update release candidate';
    }
    const tree = await this.client.createTree(branch.object.sha, this.treeFiles());
    const commit = await this.client.createCommit(branch.object.sha, tree.sha, message);
    const head = this.client.updateHead(branchName, commit.sha);
    let url = commit.html_url;

    if (created) {
      const pr = await this.client.createPullRequest(branchName);
      url = pr.html_url;
    }

    return {
      name: branchName,
      version: commit.sha,
      url,
    };
  }

  treeFiles() {
    return this.services.map(({ name, url, sdl }) => ({
      path: `${this.registryPath}/${name}.graphql`,
      content: `# $url ${url}\n\n${sdl}`,
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

  async loadRegistryServices() {
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

  async loadLocalServices() {
    return Promise.all(this.endpoints.map(async (service) => {
      const url = service.url[this.env];
      const sdl = await fetchLocalSDL(makeRemoteExecutor(url));
      return { name: service.name, url, sdl };
    }));
  }

  async load() {
    if (this.env === 'production' && (!this.registryVersion || this.registryVersion !== await this.getRegistryVersion())) {
      this.services = await this.loadRegistryServices();
      this.schema = await this.buildSchema(this.services);
    } else {
      this.services = await this.loadLocalServices();
      this.schema = await this.buildSchema(this.services);
    }
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
