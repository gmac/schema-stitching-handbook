const { fetch } = require('cross-fetch');
const { print } = require('graphql');
const AbortController = require('abort-controller');

// Builds a remote schema executor function,
// customize any way that you need (auth, headers, etc).
// Expects to recieve an object with "document" and "variable" params,
// and asynchronously returns a JSON response from the remote.
module.exports = function makeRemoteExecutor(url, { timeout=500, headers={} }={}) {
  return async ({ document, variables }) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const query = typeof document === 'string' ? document : print(document);
      const fetchResult = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ query, variables }),
        signal: controller.signal,
      });
      return await fetchResult.json();
    } catch (error) {
      return error.name === 'AbortError' ? new Error(`Request exceeded timeout of ${timeout}`) : error;
    } finally {
      clearTimeout(timeoutId);
    }
  };
};
