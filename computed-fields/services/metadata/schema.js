const { makeExecutableSchema } = require('@graphql-tools/schema');
const NotFoundError = require('../../lib/not_found_error');
const readFileSync = require('../../lib/read_file_sync');
const typeDefs = readFileSync(__dirname, 'schema.graphql');

// data fixtures
const metadatas = [
  { id: '1', __typename: 'GeoLocation', name: 'Old Trafford, Greater Manchester, England', lat: 53.4621, lon: 2.2766 },
  { id: '2', __typename: 'SportsTeam', name: 'Manchester United', locationId: '1' },
  { id: '3', __typename: 'TelevisionSeries', name: 'Great British Baking Show', season: 7 },
  { id: '4', __typename: 'GeoLocation', name: 'Great Britain', lat: 55.3781, lon: 3.4360 },
  { id: '5', __typename: 'GeoLocation', name: 'Argentina', lat: 38.4161, lon: 63.6167 },
];

const categories = [
  { id: '1', name: 'Sports' },
  { id: '2', name: 'Cooking' },
  { id: '3', name: 'Travel' },
];

module.exports = makeExecutableSchema({
  typeDefs,
  resolvers: {
    Query: {
      _products: (root, { keys }) => keys,
    },
    Product: {
      metadata(product) {
        return product.metadataIds ? product.metadataIds.map(id => metadatas.find(m => m.id === id) || new NotFoundError()) : null;
      },
      category(product) {
        return product.categoryId ? categories.find(c => c.id === product.categoryId) : null;
      }
    },
    SportsTeam: {
      location(team) {
        return metadatas.find(m => m.id === team.locationId) || new NotFoundError();
      }
    }
  }
});
