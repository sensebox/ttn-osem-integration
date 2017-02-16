'use strict';

/* eslint-env mocha */

const chakram = require('chakram'),
  expect = chakram.expect;

const cfg = require('../config');

// test data
const BASE_URL = `http://localhost:${cfg.port}`,
  TTNpayload_v1_valid = require('./data/TTNpayload_v1_valid.json'),
  TTNpayload_v1_invalid = JSON.parse(JSON.stringify(TTNpayload_v1_valid));

TTNpayload_v1_invalid.payload_raw = 'asdf';

describe('endpoint v1.1', () => {

  describe('POST /measurement', () => {
    const URL = `${BASE_URL}/v1.1/measurement`;

    it('should exist', () => {
      const res = chakram.post(URL);

      return expect(res).to.have.not.status(404);
    });

    it('should respond 422 for empty request payloads', () => {
      const res = chakram.post(URL, {});

      return expect(res).to.have.status(422);
    });

    it('should respond 404 for nonexistent boxes', () => {
      // FIXME: ensure box with this ID does not exist
      const res = chakram.post(URL, TTNpayload_v1_valid);

      return expect(res).to.have.status(404);
    });

    /*it('should respond 422 for invalid request payloads', () => {
      const res = chakram.post(URL, TTNpayload_v1_invalid);

      return expect(res).to.have.status(422);
    });

    it('should respond 201 for valid request payloads', () => {
      // FIXME: ensure box with this ID exists
      const res = chakram.post(URL, TTNpayload_v1_valid);

      return expect(res).to.have.status(201);
    });


    it('should add 5 measurements to the database', () => {

    });*/
  });

});
