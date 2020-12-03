const { fetch } = require('cross-fetch');
const { print } = require('graphql');

module.exports = function makeRemoteExecutor(url, options={}) {
  return async ({ document, variables }) => {
    const query = typeof document === 'string' ? document : print(document);
    if (options.log) console.log(`OPERATION ${new Date().toISOString()}:\n${query}`);

    const fetchResult = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
    return fetchResult.json();
  };
};
