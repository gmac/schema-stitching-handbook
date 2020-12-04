const { fetch } = require('cross-fetch');
const { print } = require('graphql');

module.exports = function makeRemoteExecutor(url, log=false) {
  return async ({ document, variables }) => {
    const query = typeof document === 'string' ? document : print(document);
    const fetchResult = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
    return fetchResult.json();
  };
};
