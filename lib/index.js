'use strict';

const express = require('express'),
  bodyParser = require('body-parser'),
  server = express(),
  { connect, mongoose } = require('openSenseMapAPI').db,
  cfg = require('../config'),
  v11Router = require('./routes/v1.1');

server.use((req, res, next) => {
  req.time = new Date();
  if (cfg.loglevel === 'info') {
    console.log(`${req.time.toISOString()}  ${req.ip}\t[${req.method}] ${req.url}`);
  }
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
      console.log('server listening on :3000');
    } else {
      console.error(err);
    }
  });
});
