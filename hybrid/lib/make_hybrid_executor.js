const { fetch } = require("cross-fetch");
const { getOperationAST, print } = require("graphql");

module.exports = function makeHybridExecutor(url) {
  // Decides whether to use the httpExecutor (query/mutation) or the wsExecutor(subscription)
  return async (args) => {
    console.log(args);
    // get the operation node of from the document that should be executed
    const operation = getOperationAST(args.document, args.operationName);
    // subscription operations should be handled by the wsExecutor
    if (operation?.operation === "subscription") {
      return wsExecutor(url, args);
    }
    // all other operations should be handled by the httpExecutor
    return httpExecutor(url, args);
  };
};

// Handle queries and mutations
const httpExecutor = async (url, { document, variables, context }) => {
  const query = typeof document === "string" ? document : print(document);
  const fetchResult = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: context?.authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  return fetchResult.json();
};

// Handle subscriptions
const wsExecutor = async (
  url,
  { document, variables, operationName, extensions, context }
) => {
  const subscriptionClient = createClient({
    url,
    webSocketImpl: WebSocket,
  });

  // Pass per request auth et al via extensions
  const ext = Object.assign(
    {
      customConnectionParams: {
        authorization: context?.authHeader,
      },
    },
    extensions
  );

  return observableToAsyncIterable({
    subscribe: (observer) => {
      return {
        unsubscribe: subscriptionClient.subscribe(
          {
            operationName,
            variables,
            extensions: ext,
            query: print(document),
          },
          {
            next: (data) => observer.next?.(data),
            error(err) {
              if (!observer.error) {
                return;
              }
              if (err instanceof Error) {
                observer.error(err);
              } else if (
                !_.isNil(err?.["code"]) &&
                !_.isUndefined(err?.["wasClean"])
              ) {
                observer.error(
                  new Error(`Socket closed with event ${err.code}`)
                );
              } else if (Array.isArray(err)) {
                observer.error(
                  new Error(err.map(({ message }) => message).join(", "))
                );
              }
            },
            complete: () => observer.complete?.(),
          }
        ),
      };
    },
  });
};
