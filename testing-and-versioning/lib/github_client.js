const { fetch } = require('cross-fetch');
const makeRemoteExecutor = require('./make_remote_executor');

async function jsonOrError(res, status) {
  console.log(res.status, res.url);
  if (res.status !== status) {
    const json = await res.json();
    const err = new Error(json.message || res.statusText);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

module.exports = class GitHubClient {
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
        tree: files,
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
