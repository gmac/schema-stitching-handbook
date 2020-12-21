const products = [
  { upc: '1', name: 'gizmo' },
  { upc: '2', name: 'widget' },
];

module.exports = {
  resolvers: {
    Query: {
      products: (_, { upcs }) => upcs.map(upc => products.find(p => p.upc === upc)),
    },
  },
  mocks: {
    Int: () => 23,
  }
};
