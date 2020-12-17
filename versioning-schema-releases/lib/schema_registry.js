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
          object {
            ...on Blob {
              text
            }
          }
        }
      }
    }
  }
}`;

// fetches local SDLs using a retry loop
// (coordinates gateway reload while restarting all services)
async function fetchLocalSDL(url) {
  const executor = makeRemoteExecutor(url);
  return new Promise((resolve, reject) => {
    async function next(attempt=1) {
      try {
        const { data } = await executor({ document: '{ _sdl }' });
        resolve(data._sdl);
      } catch (err) {
        if (attempt >= 10) reject(err);
        setTimeout(() => next(attempt+1), 500);
      }
    }
    next();
  });
}

// Simple registry for loading schemas locally or from the versioning repo
// Includes:
// - Loaders for fetching local service schemas and registry repo schemas
// - Mutations for sending local schemas to a Git release branch
// - Polling for detecting registry version changes (used in production)
module.exports = class SchemaRegistry {
  constructor(config) {
    this.env = config.env;
    this.client = new GitHubClient(config.repo);
    this.endpoints = config.endpoints;
    this.buildSchema = config.buildSchema;
    this.registryPath = config.repo.registryPath;
    this.remoteVersion = null;
    this.schema = null;
    this.services = [];
  }

  async createReleaseBranch(branchName, message='create release candidate') {
    const branch = await this.client.createBranch(branchName);
    const tree = await this.client.createTree(branch.object.sha, await this.treeFiles());
    const commit = await this.client.createCommit(branch.object.sha, tree.sha, message);
    const head = await this.client.updateBranchHead(branchName, commit.sha);
    const pr = await this.client.createPullRequest(branchName);
    return {
      name: branchName,
      sha: commit.sha,
      url: commit.html_url,
      pullRequestUrl: pr.html_url,
    };
  }

  async updateReleaseBranch(branchName, message='update release candidate') {
    const branch = await this.client.getBranch(branchName);
    const tree = await this.client.createTree(branch.object.sha, await this.treeFiles());
    const commit = await this.client.createCommit(branch.object.sha, tree.sha, message);
    const head = await this.client.updateBranchHead(branchName, commit.sha);
    let pr = await this.client.getPullRequest(branchName);
    pr = pr || await this.client.createPullRequest(branchName);
    return {
      name: branchName,
      sha: commit.sha,
      url: commit.html_url,
      pullRequestUrl: pr.html_url,
    };
  }

  async createOrUpdateReleaseBranch(branchName, message) {
    let branch, created = false;
    try {
      branch = await this.client.getBranch(branchName);
      message = message || 'update release candidate';
    } catch (err) {
      if (err.status !== 404) throw err;
      branch = await this.client.createBranch(branchName);
      message = message || 'create release candidate';
      created = true;
    }
    const tree = await this.client.createTree(branch.object.sha, await this.treeFiles());
    const commit = await this.client.createCommit(branch.object.sha, tree.sha, message);
    const head = await this.client.updateBranchHead(branchName, commit.sha);
    let pr = !created ? await this.client.getPullRequest(branchName) : null;
    pr = pr || await this.client.createPullRequest(branchName);

    return {
      name: branchName,
      sha: commit.sha,
      url: commit.html_url,
      pullRequestUrl: pr.html_url,
    };
  }

  async mergeReleaseBranch(branchName, message) {
    const release = await this.client.mergePullRequest(branchName, message);
    return {
      name: branchName,
      sha: release.sha,
    };
  }

  async treeFiles() {
    await this.reload();
    return this.services.map(({ name, sdl }) => ({
      path: `${this.registryPath}/${name}.graphql`,
      content: `# url: ${this.endpoints.find(e => e.name === name).url.production}\n${sdl}`,
      mode: '100644',
      type: 'blob',
    }));
  }

  async getRemoteVersion() {
    const { data } = await this.client.graphql({
      document: FETCH_REGISTRY_VERSION,
      variables: {
        owner: this.client.owner,
        repo: this.client.repo,
        path: `${this.client.mainBranch}:${this.registryPath}`,
      }
    });

    if (data.repository && data.repository.object) {
      const version = data.repository.object.oid;
      console.log(`version ${Date.now()}: ${version}`);
      return version;
    }

    console.log('version failed to fetch, skipping...');
    return this.remoteVersion;
  }

  async loadRemoteSchemas() {
    const urlPattern = /# url: ([^\n]+)\n/;
    const { data } = await this.client.graphql({
      document: FETCH_REGISTRY_FILES,
      variables: {
        owner: this.client.owner,
        repo: this.client.repo,
        path: `${this.client.mainBranch}:${this.registryPath}`,
      }
    });

    if (!data.repository.object) {
      throw 'No repo content found at registry path. Have you committed files yet?';
    }

    this.remoteVersion = data.repository.object.oid;
    console.log(`VERSION UPDATE: ${this.remoteVersion}`);

    return data.repository.object.entries.map(entry => ({
      name: entry.name.replace(/\.graphql$/, ''),
      sdl: entry.object.text.replace(urlPattern, ''),
      url: entry.object.text.match(urlPattern)[1],
    }));
  }

  // Load schemas for initial production startup...
  // ideally loads from a local cache, rather than relying on a remote source
  async loadStartupSchemas() {
    // If you use your gateway app's repo as the schema registry,
    // then you can simply read schemas from the local source during startup:

    // return this.endpoints.map(async (service) => {
    //   return {
    //     name: service.name,
    //     url: service.url.production,
    //     sdl: readFileSync(__dirname, `../${this.registryPath}/${service.name}.graphql`)
    //   };
    // });

    return this.loadRemoteSchemas();
  }

  async loadDevSchemas() {
    return Promise.all(this.endpoints.map(async (service) => {
      const url = service.url[this.env];
      return {
        name: service.name,
        sdl: await fetchLocalSDL(url),
        url,
      };
    }));
  }

  async reload() {
    if (this.env === 'production') {
      if (!this.schema) {
        // initial startup in production environment...
        // ideally reads schemas from a local cache rather than relying on a remote source
        this.services = await this.loadStartupSchemas();
        this.schema = await this.buildSchema(this.services);

      } else if (!this.remoteVersion || this.remoteVersion !== await this.getRemoteVersion()) {
        // subsequent production reload (polling update, API refresh request)
        // attempt to reload from the remote schema registry
        this.services = await this.loadRemoteSchemas();
        this.schema = await this.buildSchema(this.services);
      }
    } else {
      this.services = await this.loadDevSchemas();
      this.schema = await this.buildSchema(this.services);
    }
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
