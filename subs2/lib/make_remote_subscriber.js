const ws = require('ws');
const { createClient } = require('graphql-ws');
const { observableToAsyncIterable } = require('@graphql-tools/utils');

module.exports = function makeRemoteSubscriber(url) {
  const client = createClient({ url, webSocketImpl: ws });
  return ({ document, variables }) => {
    console.log('Subscriber!', document);

    return observableToAsyncIterable({
      subscribe: (observer) => ({
        unsubscribe: client.subscribe({
          query: document,
          variables,
        }, {
          next: (data) => observer.next && observer.next(data),
          error: (err) => {
            if (!observer.error) return;
            if (err instanceof Error) {
              observer.error(err);
            } else if (err.constructor.name === 'CloseEvent') {
              observer.error(new Error(`Socket closed with event ${err.code}`));
            } else {
              observer.error(new Error(err.map(({ message }) => message).join(', ')));
            }
          },
          complete: () => observer.complete && observer.complete(),
        })
      })
    });
  };
};
