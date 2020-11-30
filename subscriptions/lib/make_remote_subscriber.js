const ws = require('ws');
const { createClient } = require('graphql-ws');
const { print } = require('graphql');

module.exports = function makeRemoteSubscriber(url) {
  const client = createClient({ url, webSocketImpl: ws });
  return async ({ document, variables }) => {
    const pending = [];
    let deferred = null;
    let error = null;
    let done = false;

    const query = print(document);
    const dispose = client.subscribe({
      query,
      variables,
    }, {
      next: data => {
        pending.push(data);
        deferred && deferred.resolve(false);
      },
      error: err => {
        error = err;
        deferred && deferred.reject(error);
      },
      complete: () => {
        done = true;
        deferred && deferred.resolve(true);
      },
    });

    return {
      [Symbol.asyncIterator]() {
        return this;
      },
      async next() {
        if (done) return { done: true, value: undefined };
        if (error) throw error;
        if (pending.length) return { value: pending.shift() };
        return (await new Promise((resolve, reject) => (deferred = { resolve, reject })))
          ? { done: true, value: undefined }
          : { value: pending.shift() };
      },
      async return() {
        dispose();
        return { done: true, value: undefined };
      },
    };
  };
};
