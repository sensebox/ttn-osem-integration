'use strict';

/* eslint-env mocha */

const chakram = require('chakram'),
  expect = chakram.expect;

const cfg = require('../config'),
  { connectWithRetry } = require('openSenseMapAPI/lib/utils'),
  { Box, Measurement } = require('openSenseMapAPI/lib/models');

// test data
const BASE_URL = `http://localhost:${cfg.port}`,
  boxData = require('./data/ttnBox.json'),
  TTNpayload_v1_valid = require('./data/TTNpayload_v1_valid.json'),
  TTNpayload_v1_invalid = JSON.parse(JSON.stringify(TTNpayload_v1_valid)),
  TTNpayload_v1_nonexistent = JSON.parse(JSON.stringify(TTNpayload_v1_valid));

TTNpayload_v1_invalid.payload_raw = 'asdf';
TTNpayload_v1_nonexistent.app_id = 'asdfasdf i do not exist';

describe('endpoint v1.1', () => {

  describe('POST /measurement', () => {
    const URL = `${BASE_URL}/v1.1/measurement`;
    let measurementCountBefore;

    before(function (done) {
      this.timeout(10000);

      // wait for DB connection
      connectWithRetry(() => {})
        // ensure nonexistent box does not exist
        .then(() => Box.findOne({
          'integrations.ttn.app_id': TTNpayload_v1_nonexistent.app_id,
          'integrations.ttn.dev_id': TTNpayload_v1_nonexistent.dev_id
        }))
        .then(box => {
          if (box) {
            return box.removeSelfAndMeasurements();
          }

          return Promise.resolve();
        })
        // ensure existent box does exist
        .then(() => Box.findOneAndUpdate(boxData, boxData, { upsert: true }))
        .then(() => Measurement.count({}))
        // get initial count of measurements
        .then(count => {
          measurementCountBefore = count;
          done();
        });
    });

    it('should exist', () => {
      return chakram.post(URL).then(res => {
        expect(res).to.have.not.status(404);

        return chakram.wait();
      });
    });

    it('should respond 422 for empty request payloads', () => {
      return chakram.post(URL, {}).then(res => {
        expect(res).to.have.status(422);

        return chakram.wait();
      });

    });

    it('should respond 404 for nonexistent boxes', () => {
      // FIXME: ensure box with this ID does not exist
      return chakram.post(URL, TTNpayload_v1_nonexistent).then(res => {
        expect(res).to.have.status(404);

        return chakram.wait();
      });
    });

    it('should respond 422 for invalid request payloads', () => {
      // FIXME: ensure box with this ID exists
      return chakram.post(URL, TTNpayload_v1_invalid).then(res => {
        expect(res).to.have.status(422);

        return chakram.wait();
      });
    });

    it('should respond 201 for valid request payloads', () => {
      // FIXME: ensure box with this ID exists
      return chakram.post(URL, TTNpayload_v1_valid).then(res => {
        expect(res).to.have.status(201);

        return chakram.wait();
      });
    });

    it('should add measurements to the database', () => {
      return Measurement.count({}).then(countAfter => {
        expect(countAfter).to.equal(measurementCountBefore + 5);

        return chakram.wait();
      });
    });
  });

});
