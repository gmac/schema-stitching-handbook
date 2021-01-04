const { fetch } = require('cross-fetch');
const { print } = require('graphql');

module.exports = function makeRemoteExecutor(url, name) {
  return async ({ document, variables }) => {
    const query = typeof document === 'string' ? document : print(document);
    const fetchResult = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });

    const result = await fetchResult.json();
    console.log('REQUEST TO:', name);
    console.log('query', query);
    console.log('variables', variables);
    console.log(JSON.stringify(result.data._entities, null, 2));
    console.log('\n***********\n');
    return result;
  };
};
