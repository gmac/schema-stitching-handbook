const makeServer = require('../../lib/make_server');
makeServer(require('./schema'), 'inventory', 4002);