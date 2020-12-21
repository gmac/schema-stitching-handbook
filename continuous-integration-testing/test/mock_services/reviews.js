const reviews = [
  { id: '1', body: 'great', author: { id: '1' }, product: { upc: '1' } },
  { id: '2', body: 'awful', author: { id: '2' }, product: { upc: '2' } },
];

module.exports = {
  resolvers: {
    Query: {
      review: (_, { id }) => reviews.find(r => r.id === id),
      _users: (_, { ids }) => ids.map(id => ({ id })),
      _products: (_, { upcs }) => upcs.map(upc => ({ upc })),
    },
    Product: {
      reviews: (p) => reviews.filter(r => r.product.upc === p.upc),
    },
    User: {
      reviews: (u) => reviews.filter(r => r.author.id === u.id),
    }
  }
};
