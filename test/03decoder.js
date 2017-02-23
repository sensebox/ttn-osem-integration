'use strict';

/* eslint-env mocha */

const chai = require('chai'),
  expect = chai.expect,
  assert = chai.assert;

const decoder = require('../lib/decoder'),
  referenceImpl = require('./data/decoderReferenceImplementation');

// test data
const rawPayload_base64 = 'kzIrIYzlOycAMgEA',
  rawPayload_bytes = Buffer.from('93322B218CE53B2700320100', 'hex'),
  rawPayload_bytes_invalid = Buffer.from('93322B218CE53B0100', 'hex'),
  sensorMap = {
    temperature: 'temp',
    pressure: 'press',
    humidity: 'humid',
    uvLight: 'uv',
    lightIntensity: 'light'
  };

describe('decoder vX.1', () => {
  let referenceResult;

  before(() => {
    referenceResult = referenceImpl(rawPayload_bytes, sensorMap);
  });

  it('should return error for missing sensorIds', () => {
    const result = decoder.bytesToMeasurement(rawPayload_bytes, {});

    return expect(result).to.be.a('string');
  });

  it('should return error for to few/many bytes', () => {
    const result = decoder.bytesToMeasurement(rawPayload_bytes_invalid, sensorMap);

    return expect(result).to.be.a('string');
  });

  it('should return same results as reference implementation (input: bytes)', () => {
    const result = decoder.bytesToMeasurement(rawPayload_bytes, sensorMap);

    return assert.deepEqual(referenceResult, result);
  });

  it('should decode base64 to measurements with same result', () => {
    const result = decoder.base64ToMeasurement(rawPayload_base64, sensorMap);

    return assert.deepEqual(referenceResult, result);
  });

});
