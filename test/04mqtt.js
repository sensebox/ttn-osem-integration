'use strict';

/* eslint-env mocha */

const chakram = require('chakram'),
  expect = chakram.expect;

chakram.addRawPlugin('one', require('chai-things'));

const cfg = require('../config'),
  { connect, mongoose } = require('openSenseMapAPI').db,
  { Box, Measurement } = require('openSenseMapAPI').models;

describe('TTN MQTT subscription', () => {

  // HOWTO end to end tests? log about errors, connect on startup, log disconnection, reconnect..

  before(done => {
    // TODO: check if ttnctl is available to send simulated uplink messages
    done()
  });

  it('should ignore devices whose box can\'t be found', () => {
    // ie: it should not *crash*
  });

  it('should ignore devices whose box has no valid ttn config', () => {

  });

  it('should ignore messages with invalid payload', () => {

  });

  it('should store measurements for valid payloads', () => {

  });

});
