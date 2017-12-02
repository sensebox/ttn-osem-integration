'use strict';

const express = require('express'),
  bodyParser = require('body-parser'),
  server = express(),
  { connect, mongoose } = require('openSenseMapAPI').db,
  cfg = require('../config'),
  { getApp, getMqtt } = require('./ttn'),
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

const msg = `404 Not Found. Available routes:

POST  /v1.1
      webhook for messages from the TTN HTTP Integration
      payload format: https://www.thethingsnetwork.org/docs/applications/http/

GET   /1.1/ttndevice/:boxId
      get the TTN device for a given box. must be called once to enable the feature
      for a box. (alternative to the webhook feature)
      requires auth.
`;

server.use(function notFoundHandler (req, res, next) {
  if (!res || res.finished !== true) {
    res
      .status(404)
      .type('txt')
      .send(msg);
  }
  next();
});

// launch server & connect to TTN once connected to DB
mongoose.set('debug', false);
connect()
  .then(function onDBConnection () {
    server.listen(cfg.port, (err) => {
      if (err) {
        throw err;
      }

      httpLog.info(`HTTP API listening on port ${cfg.port}`);
    });

    // app doesnt have to be initialized at startup,
    // but makes first request faster & catches errors earlier
    return Promise.all([getApp(), getMqtt()]);
  })
  .catch(function (err) {
    httpLog.fatal({ err });
    process.exit(1);
  });
