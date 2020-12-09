const { fetch } = require('cross-fetch');
const makeRemoteExecutor = require('./make_remote_executor');

async function jsonOrError(res, status) {
  if (res.status !== status) {
    const json = await res.json();
    const err = new Error(json.message || res.statusText);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

class GitHubClient {
  constructor({ owner, repo, token, mainBranch }) {
    this.owner = owner;
    this.repo = repo;
    this.mainBranch = mainBranch;
    this.headers = {
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    this.graphql = makeRemoteExecutor('https://api.github.com/graphql', { headers: this.headers });
  }

  async getHead(branchName) {
    const res = await fetch(`https://api.github.com/repos/${this.owner}/${this.repo}/git/ref/heads/${branchName}`, {
      method: 'GET',
      headers: this.headers,
    });

    return jsonOrError(res, 200);
  }

  async createHead(branchName) {
    const main = await this.getHead(this.mainBranch);
    const res = await fetch(`https://api.github.com/repos/${this.owner}/${this.repo}/git/refs`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: main.object.sha,
      }),
    });

    return jsonOrError(res, 201);
  }

  async updateHead(branchName, sha, force=true) {
    const res = await fetch(`https://api.github.com/repos/${this.owner}/${this.repo}/git/refs/heads/${branchName}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify({
        sha,
        force
      }),
    });

    return jsonOrError(res, 200);
  }

  async createTree(headRef, files) {
    const res = await fetch(`https://api.github.com/repos/${this.owner}/${this.repo}/git/trees`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        base_tree: headRef,
        tree: files.map(({ path, content }) => ({ path, content, mode: '100644', type: 'blob' })),
      }),
    });

    return jsonOrError(res, 201);
  }

  async createCommit(headRef, tree, message) {
    const res = await fetch(`https://api.github.com/repos/${this.owner}/${this.repo}/git/commits`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        parents: [headRef],
        tree,
        message,
      }),
    });

    return jsonOrError(res, 201);
  }

  async createPullRequest(branchName) {
    const res = await fetch(`https://api.github.com/repos/${this.owner}/${this.repo}/pulls`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        title: `Graph Schema: ${branchName}`,
        head: branchName,
        base: this.mainBranch,
      }),
    });

    return jsonOrError(res, 201);
  }
};

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

class SchemaRegistry {
  constructor(config) {
    this.client = new GitHubClient(config);
    this.registryPath = config.registryPath;
    this.registryVersion = null;
    this.services = config.services;
    this.buildSchema = config.buildSchema;
  }

  filesFromEndpoints(endpoints) {
    return endpoints.map(({ name, url, sdl }) => ({
      path: `${this.registryPath}/${name}.graphql`,
      contents: `# $url ${url.production || url.development}\n\n${sdl}`,
      mode: '100644',
      type: 'blob',
    }));
  }

  async createRelease(branchName, endpoints, message='create release candidate') {
    const branch = await this.client.createHead(branchName);
    const tree = await this.client.createTree(branch.object.sha, this.filesFromEndpoints(endpoints));
    const commit = await this.client.createCommit(branch.object.sha, tree.sha, message);
    const head = await this.client.updateHead(branchName, commit.sha);
    await this.client.createPullRequest(branchName);
    return branchName;
  }

  async updateRelease(branchName, endpoints, message='update release candidate') {
    const head = await this.client.getHead(branchName);
    const tree = await this.client.createTree(head.object.sha, this.filesFromEndpoints(endpoints));
    const commit = await this.client.createCommit(head.object.sha, tree.sha, message);
    await this.client.updateHead(branchName, commit.sha);
    return branchName;
  }

  async createOrUpdateRelease(branchName, endpoints, message) {
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
    const tree = await this.client.createTree(branch.object.sha, this.filesFromEndpoints(endpoints));
    const commit = await this.client.createCommit(branch.object.sha, tree.sha, message);
    const head = this.client.updateHead(branchName, commit.sha);
    if (created) await this.client.createPullRequest(branchName);
    return branchName;
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
      const sdl = await fetchLocalSDL(makeRemoteExecutor(service.url.development));
      return {
        name: service.name,
        url: service.url.development,
        sdl,
      };
    }));
  }

  loadSchema() {

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

module.exports = {
  GitHubClient,
  SchemaRegistry,
};
