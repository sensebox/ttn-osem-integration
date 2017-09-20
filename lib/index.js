'use strict';

const express = require('express'),
  bodyParser = require('body-parser'),
  server = express(),
  { connect, mongoose } = require('openSenseMapAPI').db,
  cfg = require('../config'),
  { initMqtt } = require('./mqtt'),
  { createLogger } = require('./logging'),
  v11Router = require('./routes/v1.1');

const httpLog = createLogger('http');

server.use(function reqLogger (req, res, next) {
  req.time = new Date();
  httpLog.debug({ req }, `${req.method} ${req.url} from ${req.ip}`);
  next();
});

server.use(bodyParser.json());

// major version: TTN HTTP API version
// minor version: version of this API
server.use('/v1.1', v11Router);

// launch server & connect to TTN once connected to DB
mongoose.set('debug', false);
connect()
  .then(function onDBConnection () {
    server.listen(cfg.port, (err) => {
      if (!err) {
        httpLog.info(`HTTP API listening on port ${cfg.port}`);
      } else {
        httpLog.error(err);
      }
    });

    return initMqtt();
  })
  .catch(httpLog.fatal);
