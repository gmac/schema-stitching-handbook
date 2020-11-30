const ws = require('ws');
const { createClient } = require('graphql-ws');
const { observableToAsyncIterable } = require('@graphql-tools/utils');

module.exports = function makeRemoteSubscriber(url) {
  const client = createClient({ url, webSocketImpl: ws });
  console.log('makeRemoteSubscriber', client);

  (async () => {
    await new Promise((resolve, reject) => {
      client.subscribe(
        {
          query: 'newPost { message }',
        },
        {
          next: (data) => { console.log('next', data) },
          error: reject,
          complete: resolve,
        },
      );
    });
  })();

  return ({ document, variables }) => observableToAsyncIterable({
    subscribe: (observer) => ({
      unsubscribe: client.subscribe({
        query: document,
        variables,
      }, {
        next: (data) => {
          console.log('next', data);
          return observer.next && observer.next(data);
        },
        error: (err) => {
          console.log('error', err);
          if (!observer.error) return;
          if (err instanceof Error) {
            observer.error(err);
          } else if (err.constructor.name === 'CloseEvent') {
            observer.error(new Error(`Socket closed with event ${err.code}`));
          } else {
            observer.error(new Error(err.map(({ message }) => message).join(', ')));
          }
        },
        complete: () => {
          console.log('complete');
          return observer.complete && observer.complete();
        }
      }),
    })
  });
};
