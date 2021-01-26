const makeServer = require('../../lib/make_server');
makeServer(require('./schema'), 'accounts', 4002);
