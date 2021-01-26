# Type merging with multiple keys?

Multiple keys test/example. This explores using multiple keys to join a type across services. We have:

- Catalog service: `Product @key(selectionSet: "{ upc }")`
- Ecommerce service: `Product @key(selectionSet: "{ id upc }")`
- Reviews service: `Product @key(selectionSet: "{ id }")`

The theory here is that we should be able to traverse `Catalog > Ecomm > Reviews`, or `Reviews > Ecomm > Catalog`, or `Catalog < Ecomm > Reviews` as long as the intermediary service (ecommerce) uses an object key that accepts either key format. In practice, it seems that only going through the center (Ecomm) works. Starting at either edge results in the initial selection being made with no additional delegation attempts.

```graphql
query {
  # catalog service
  productsByUpc(upcs: ["1"]) {
    upc
    name
    retailPrice
    reviews {
      id
      body
    }
  }

  # ecommerce service
  productsByKey(keys: [
    { upc: "1" },
    { id: "102" }
  ]) {
    id
    upc
    name
    retailPrice
    reviews {
      id
      body
    }
  }

  # reviews service
  productsById(ids: ["101"]) {
    id
    name
    retailPrice
    reviews {
      id
      body
    }
  }
}
```
