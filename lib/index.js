'use strict';

const express = require('express'),
  bodyParser = require('body-parser'),
  server = express(),
  { connect, mongoose } = require('openSenseMapAPI').db,
  cfg = require('../config'),
  { createLogger } = require('./logging'),
  v11Router = require('./routes/v1.1');

const log = createLogger('server');

server.use(function reqLogger (req, res, next) {
  req.time = new Date();
  log.debug({ req }, `${req.method} ${req.url} from ${req.ip}`);
  next();
});

server.use(bodyParser.json());

// major version: TTN HTTP API version
// minor version: version of this API
server.use('/v1.1', v11Router);

// launch server once connected to DB
mongoose.set('debug', false);
connect().then(function onDBConnection () {
  server.listen(cfg.port, (err) => {
    if (!err) {
      log.info(`server listening on port ${cfg.port}`);
    } else {
      log.error(err);
    }
  });
});
