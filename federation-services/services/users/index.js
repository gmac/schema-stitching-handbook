const makeServer = require('../../lib/make_server');
makeServer(require('./schema'), 'users', 4003);
