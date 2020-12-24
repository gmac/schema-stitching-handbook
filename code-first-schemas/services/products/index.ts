import * as makeServer from '../../lib/make_server';
import schema from './schema';

schema.then(s => {
  makeServer(s, 'products', 4003);
});
