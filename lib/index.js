'use strict';

const express = require('express'),
  bodyParser = require('body-parser'),
  { data: ttnClient } = require('ttn'),
  server = express(),
  { connect, mongoose } = require('openSenseMapAPI').db,
  cfg = require('../config'),
  { createLogger } = require('./logging'),
  v11Router = require('./routes/v1.1');

const httpLog = createLogger('http');
const mqttLog = createLogger('mqtt');

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

    // TODO: separate module?
    return ttnClient(cfg.ttn.appId, cfg.ttn.key);
  })
  .then(function onTTNClient (ttnClient) {
    ttnClient.on('error', function onTTNError (err) {
      mqttLog.error({ err }, 'could not connect to TTN');
    });

    ttnClient.on('connect', function onTTNConnection () {
      mqttLog.info(`connected to TTN app ${cfg.ttn.appId}`);
    });

    ttnClient.on('uplink', function handleMqttUplink (dev_id, message) {
      // TODO: match associated box via dev_uid or dev_id
      // TODO: pass message to decoding/index.js#decodeBase64()
      // TODO: insert into DB
    });

    // TODO: hook to register devices in TTN when called from osemApi or something
    // - return dev_uid, app_uid, app_key ?
  })
  .catch(httpLog.fatal);
