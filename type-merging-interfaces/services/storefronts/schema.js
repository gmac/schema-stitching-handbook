const { makeExecutableSchema } = require('@graphql-tools/schema');
const NotFoundError = require('../../lib/not_found_error');
const readFileSync = require('../../lib/read_file_sync');
const typeDefs = readFileSync(__dirname, 'schema.graphql');

// data fixtures
const storefronts = [
  {
    id: '1',
    name: 'eShoppe',
    productOfferKeys: [
      'Product:1',
      'ProductDeal:1',
      'Product:2',
    ]
  },
  {
    id: '2',
    name: 'BestBooks Online',
    productOfferKeys: [
      'Product:3',
      'Product:4',
      'ProductDeal:2',
      'Product:5',
    ]
  },
];

const productDeals = [
  { id: '1', name: 'iPhone + Survival Guide', price: 679.99, productIds: ['1', '5'] },
  { id: '2', name: 'Best Sellers', price: 19.99, productIds: ['3', '4'] },
];

module.exports = makeExecutableSchema({
  typeDefs,
  resolvers: {
    Query: {
      storefront: (root, { id }) => storefronts.find(s => s.id === id) || new NotFoundError(),
    },
    Storefront: {
      products(storefront) {
        return storefront.productOfferKeys.map(key => {
          const [__typename, id] = key.split(':');
          const obj = __typename === 'Product' ? { id } : productDeals.find(d => d.id === id);
          return  obj ? { __typename, ...obj } : new NotFoundError();
        });
      }
    },
    ProductDeal: {
      products: (deal) => deal.productIds.map(id => ({ id })),
    }
  }
});
