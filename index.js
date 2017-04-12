'use strict';

const express = require('express'),
  bodyParser = require('body-parser'),
  server = express(),
  { connectWithRetry } = require('openSenseMapAPI').utils,
  cfg = require('./config'),
  v11Router = require('./lib/routes/v1.1');

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
connectWithRetry(() => {
  server.listen(cfg.port, (err) => {
    if (!err) {
      console.log('server listening on :3000');
    } else {
      console.error(err);
    }
  });
});
