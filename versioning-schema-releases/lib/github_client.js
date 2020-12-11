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

// Simple client for talking to the GitHub API v3 (REST)
// (the v4 GraphQL API does not provide the gitdata interface)
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

    this.graphql = makeRemoteExecutor('https://api.github.com/graphql', {
      headers: this.headers,
      timeout: 3500,
    });
  }

  async getBranch(branchName) {
    const res = await fetch(`https://api.github.com/repos/${this.owner}/${this.repo}/git/ref/heads/${branchName}`, {
      method: 'GET',
      headers: this.headers,
    });

    return jsonOrError(res, 200);
  }

  async createBranch(branchName) {
    const main = await this.getBranch(this.mainBranch);
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

  async updateBranchHead(branchName, sha, force=false) {
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

  async getPullRequest(branchName) {
    const res = await fetch(`https://api.github.com/repos/${this.owner}/${this.repo}/pulls?head=${this.owner}:${branchName}&state=open`, {
      method: 'GET',
      headers: this.headers,
    });

    const json = await jsonOrError(res, 200);
    return json[0];
  }

  async createPullRequest(branchName) {
    const res = await fetch(`https://api.github.com/repos/${this.owner}/${this.repo}/pulls`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        title: `Gateway schema release: ${branchName}`,
        body: 'Release candidate for remote schema revisions',
        head: branchName,
        base: this.mainBranch,
      }),
    });

    return jsonOrError(res, 201);
  }

  async mergePullRequest(branchName, message) {
    const pr = await this.getPullRequest(branchName);
    if (!pr) throw new Error('Not found');

    const res = await fetch(`https://api.github.com/repos/${this.owner}/${this.repo}/pulls/${pr.number}/merge`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify({
        commit_title: `[gateway schema release]: ${branchName}`,
        commit_message: message || 'merged by schema registry',
        merge_method: 'squash',
      }),
    });

    return jsonOrError(res, 200);
  }
};
