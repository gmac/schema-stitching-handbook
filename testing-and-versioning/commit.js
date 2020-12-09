var GitHubApi = require("github");

function debug(mssg, obj) {
  console.log(mssg, obj)
}

var getReferenceCommit = function (data){
  return new Promise((resolve, reject) => {
    data.github.gitdata.getReference({
      owner: data.user,
      repo: data.repo,
      ref: data.fullyQualifiedRef
    }, (err, res) => {
      if (err) {
        debug("getReferenceCommit", JSON.stringify(err, null, "  "));
        return reject(err);
      }
      return resolve(Object.assign(data, { referenceCommitSha :  res.data.object.sha }));
    });
  });
}

var createTree = function (data){
  return new Promise((resolve, reject) => {
    var files = [];
    data.files.forEach((file) => {
      if(typeof file.path === "string" && typeof file.content === "string"){
        files.push({
          path: file.path,
          mode: "100644",
          type: "blob",
          content: file.content
        });
      }
    });

    data.github.gitdata.createTree({
      owner: data.user,
      repo: data.repo,
      tree: files,
      base_tree: data.referenceCommitSha
    }, (err, res) => {
      if (err) {
        debug("createTree", JSON.stringify(err, null, "  "));
        return reject(err);
      }
      return resolve(Object.assign(data, { newTreeSha :  res.data.sha }));
    });
  });
}

var createCommit = function (data){
  return new Promise((resolve, reject) => {
    data.github.gitdata.createCommit({
      owner: data.user,
      repo: data.repo,
      message: data.commitMessage,
      tree: data.newTreeSha,
      parents: [data.referenceCommitSha]
    }, (err, res) => {
      if (err) {
        debug("createCommit", JSON.stringify(err, null, "  "));
        return reject(err);
      }
      console.log(res)
      return resolve(Object.assign(data, { newCommitSha :  res.data.sha }));
    });
  });
}

var updateRefrence = function (data){
  return new Promise((resolve, reject) => {
    data.github.gitdata.updateReference({
      owner: data.user,
      repo: data.repo,
      ref: data.fullyQualifiedRef,
      sha: data.newCommitSha,
      force: data.forceUpdate,
    }, (err, data) => {
      if (err) {
        debug("updateRefrence", JSON.stringify(err, null, "  "));
        return reject(err);
      }
      return resolve(data);
    });
  });
}

module.exports = function(opts) {
  opts = opts || {};
  if (!opts.user || !opts.repo || !opts.files || !opts.files.length){
    return "";
  }
  var data = {};
  data.github = new GitHubApi();
  if(opts.token){
    data.github.authenticate({
      type: "oauth",
      token: opts.token
    });
  }
  data.user = opts.user;
  data.repo = opts.repo;
  data.files = opts.files;
  data.fullyQualifiedRef = opts.fullyQualifiedRef || "heads/dev";
  data.forceUpdate = opts.forceUpdate || false;
  data.commitMessage = opts.commitMessage ||
    "AutoCommit - " + new Date().getTime().toString();

  return new Promise((resolve, reject) => {
    getReferenceCommit(data)
      .then(createTree)
      .then(createCommit)
      .then(updateRefrence)
      .then(resolve)
      .catch(error => reject(error));
  });
};