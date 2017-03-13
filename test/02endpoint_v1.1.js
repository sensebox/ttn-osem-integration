'use strict';

/* eslint-env mocha */

const chakram = require('chakram'),
  expect = chakram.expect;

const cfg = require('../config'),
  { connectWithRetry } = require('openSenseMapAPI/lib/utils'),
  { Box, Measurement } = require('openSenseMapAPI/lib/models');

// test data
const BASE_URL = `http://localhost:${cfg.port}`,
  box_sbhome = require('./data/ttnBox_sbhome.json'),
  box_json = require('./data/ttnBox_json.json'),
  TTNpayload_sbhome_valid = require('./data/TTNpayload_sbhome_valid.json'),
  TTNpayload_sbhome_nonexistent = require('./data/TTNpayload_sbhome_nonexistent.json'),
  TTNpayload_json_valid = require('./data/TTNpayload_json_valid.json');

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
          'integrations.ttn.app_id': TTNpayload_sbhome_nonexistent.app_id,
          'integrations.ttn.dev_id': TTNpayload_sbhome_nonexistent.dev_id
        }))
        .then(box => {
          if (box) {
            return box.removeSelfAndMeasurements();
          }

          return Promise.resolve();
        })
        // ensure existent box does exist
        .then(() => Box.update({
          'integrations.ttn.dev_id': box_sbhome.integrations.ttn.dev_id
        }, box_sbhome, { upsert: true, new: false }))
        .then(() => Box.update({
          'integrations.ttn.dev_id': box_json.integrations.ttn.dev_id
        }, box_json, { upsert: true, new: false }))
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
      return chakram.post(URL, TTNpayload_sbhome_nonexistent).then(res => {
        expect(res).to.have.status(404);

        return chakram.wait();
      });
    });

    it('should respond 201 for valid request payload_raw', () => {
      return chakram.post(URL, TTNpayload_sbhome_valid).then(res => {
        expect(res).to.have.status(201);

        return chakram.wait();
      });
    });

    it('should respond 422 for invalid request payload_raw', () => {
      TTNpayload_sbhome_valid.payload_raw = 'asdf';

      return chakram.post(URL, TTNpayload_sbhome_valid).then(res => {
        expect(res).to.have.status(422);

        return chakram.wait();
      });
    });

    it('should respond 201 for valid JSON payload', () => {
      return chakram.post(URL, TTNpayload_json_valid).then(res => {
        expect(res).to.have.status(201);

        return chakram.wait();
      });
    });

    it('should respond 422 for invalid JSON payload', () => {
      delete TTNpayload_json_valid.payload_fields;

      return chakram.post(URL, TTNpayload_json_valid).then(res => {
        expect(res).to.have.status(422);

        return chakram.wait();
      });
    });

    it('should add measurements to the database', () => {
      return Measurement.count({}).then(countAfter => {
        expect(countAfter).to.equal(measurementCountBefore + 6); // 5 sbhome + 1 json

        return chakram.wait();
      });
    });
  });

});
