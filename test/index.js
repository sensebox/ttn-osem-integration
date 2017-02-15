const chakram = require('chakram'),
  expect = chakram.expect;

// test subjects
//const app = require('../index'); // running server does not handle `mocha -w` well
const decoder = require('../lib/decoder');

// test data
const BASE_URL = 'http://localhost:3000',
  TTNpayload_v1_valid = require('./data/TTNpayload_v1_valid.json'),
  TTNpayload_v1_invalid = JSON.parse(JSON.stringify(TTNpayload_v1_valid)),
  rawPayload_base64 = 'bm8gZXhhbXBsZSBhdmFpbGFibGU=' // FIXME
  rawPayload_bytes = Buffer.from('93322B218CE53B2700320100', 'hex');

TTNpayload_v1_invalid.payload_raw = 'asdf';

describe('ttn-osem-application', () => {

  describe('server runs on :3000', () => {
    it('should respond 404 on baseurl', () => {
      const res = chakram.head(BASE_URL);
      return expect(res).to.have.status(404);
    });
  });

  describe('decoder vX.1', () => {

    it('should decode byte array to measurements', () => {
      throw new Error('not implemented yet');
      const result = decoder.decodeMeasureBytes(rawPayload_bytes);
    });

    it('should decode base64 to measurements', () => {
      throw new Error('not implemented yet');
      const result = decoder.decodeMeasureBase64(rawPayload_base64);
    });

  });

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

      it('should respond 422 for invalid request payloads', () => {
        const res = chakram.post(URL, TTNpayload_v1_invalid);
        return expect(res).to.have.status(422);
      });

      it('should respond 201 for valid request payloads', () => {
        // FIXME: ensure box with this ID exists
        const res = chakram.post(URL, TTNpayload_v1_valid);
        return expect(res).to.have.status(201);
      });

      it('should respond 404 for nonexistent boxes', () => {
        // FIXME: ensure box with this ID does not exist
        const res = chakram.post(URL, TTNpayload_v1_valid);
        return expect(res).to.have.status(404);
      });

      it('should add a measurement to the database', () => {
        throw new Error('not implemented yet');
      });
    });

  });

});
