const { fetch } = require('cross-fetch');
const { print } = require('graphql');

module.exports = function makeRemoteExecutor(url, service) {
  return async ({ document, variables }) => {
    const query = typeof document === 'string' ? document : print(document);
    console.log('--- ' + service + ' ' + url + '\n', query, variables)
    const fetchResult = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
    return fetchResult.json();
  };
};
