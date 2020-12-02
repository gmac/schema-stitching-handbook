const { fetch } = require('cross-fetch');
const AbortController = require('abort-controller');
const { print } = require('graphql');

// Builds a remote schema executor function,
// customize any way that you need (auth, headers, etc).
// Expects to recieve an object with "document" and "variable" params,
// and asynchronously returns a JSON response from the remote.
module.exports = function makeRemoteExecutorWithTimeout(url, timeout = 500) {
  return async ({ document, variables }) => {
    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);

    let result;

    try {
      const query = typeof document === 'string' ? document : print(document);
      const fetchResult = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
        signal: controller.signal,
      });
      result = await fetchResult.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        result = new Error(`Response exceeds ${timeout}. Request aborted.`);
      } else {
        result = error;
      }
    } finally {
      clearTimeout(timeoutId);
    }

    return result;
  };
};
