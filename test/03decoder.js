'use strict';

/* eslint-env mocha */

const chakram = require('chakram'),
  expect = chakram.expect;

const decoder = require('../lib/decoder');

// test data
const rawPayload_base64 = 'bm8gZXhhbXBsZSBhdmFpbGFibGU=', // FIXME
  rawPayload_bytes = Buffer.from('93322B218CE53B2700320100', 'hex');

describe('decoder vX.1', () => {

  it('should decode byte array to measurements', () => {
    const result = decoder.decodeMeasureBytes(rawPayload_bytes);
  });

  it('should decode base64 to measurements', () => {
    const result = decoder.decodeMeasureBase64(rawPayload_base64);
  });

});
