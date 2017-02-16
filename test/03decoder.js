'use strict';

/* eslint-env mocha */

const chakram = require('chakram'),
  expect = chakram.expect;

const decoder = require('../lib/decoder'),
  referenceImpl = require('./data/decoderReferenceImplementation');

// test data
const rawPayload_base64 = 'bm8gZXhhbXBsZSBhdmFpbGFibGU=', // FIXME
  rawPayload_bytes = Buffer.from('93322B218CE53B2700320100', 'hex'),
  sensorMap = {
    temperature: 'temp',
    pressure: 'press',
    humidity: 'humid',
    uvLight: 'uv',
    lightIntensity: 'light'
  };

describe('decoder vX.1', () => {

  it('should decode byte array to measurements', () => {
    const result = decoder.bytesToMeasurement(rawPayload_bytes, sensorMap);
  });

  it('should decode base64 to measurements', () => {
    const result = decoder.base64ToMeasurement(rawPayload_base64, sensorMap);
  });

  /*it('should return same results as reference implementation'), () => {

  });*/

});
