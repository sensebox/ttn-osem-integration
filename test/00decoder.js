'use strict';

/* eslint-env mocha */

// chakram breaks chai somehow, so chai tests have to run before chakram tests

const chai = require('chai'),
  expect = chai.expect;

chai.use(require('chai-things'));
chai.use(require('chai-as-promised'));

const decoder = require('../lib/decoding'),
  transformAndValidateArray = require('openSenseMapAPI/lib/decoding/transformAndValidateArray'),
  referenceImpl = require('./data/decoderReferenceImplementation');

const box_sbhome = JSON.parse(JSON.stringify(require('./data/ttnBox.json')));

describe('decoder', () => {

  it('should return error for missing TTN config', () => {
    return expect(decoder.decodeBuffer(Buffer.from('asdf', 'hex'), {}))
      .to.be.rejectedWith('box has no TTN configuration');
  });

  it('should reject unknown profiles', () => {
    return expect(decoder.decodeBuffer(Buffer.from('asdf', 'hex'), {
      integrations: { ttn: { decodeOptions: { profile: ':^)' } } }
    })).to.be.rejectedWith('profile :^) is not supported');
  });


  describe('profile: custom', () => {
    // TODO
  });


  describe('profile: sensebox/home', () => {

    const rawPayload_base64 = 'kzIrIYzlOycAMgEA',
      rawPayload_bytes = Buffer.from('93322B218CE53B2700320100', 'hex'),
      rawPayload_bytes_invalid = Buffer.from('93322B218CE53B0100', 'hex');

    let referenceResult, decoderResultBytes, decoderResultBase64;

    before(() => {
      // add custom sensorIds, as the template does not include any
      box_sbhome.sensors.map(s => {
        s._id = s.title;

        return s;
      });

      // run all the decodings once
      return Promise.all([
        transformAndValidateArray(referenceImpl(rawPayload_bytes, {
          temperature: 'Temperatur',
          humidity: 'rel. Luftfeuchte',
          pressure: 'Luftdruck',
          lightintensity: 'Beleuchtungsstärke',
          uvlight: 'UV-Intensität'
        })),
        decoder.decodeBuffer(rawPayload_bytes, box_sbhome),
        decoder.decodeBase64(rawPayload_base64, box_sbhome)
      ])
      .then(results => {
        // clean up result invariants
        results.map(result => result.map(m => {
          delete m._id; delete m.createdAt;
        }));

        referenceResult = results[0];
        decoderResultBytes = results[1];
        decoderResultBase64 = results[2];
      });
    });

    it('should return a valid measurement array', () => {
      expect(decoderResultBytes).to.be.an('array').with.lengthOf(5);
      expect(decoderResultBytes).to.all.have.property('sensor_id');
      expect(decoderResultBytes).to.all.have.property('value');
    });

    it('should return same results as reference implementation', () => {
      expect(decoderResultBytes).to.deep.equal(referenceResult);
    });

    it('should decode base64 to measurements with same result', () => {
      expect(decoderResultBase64).to.deep.equal(decoderResultBytes);
    });

    it('should return error for too few/many bytes', () => {
      return expect(decoder.decodeBuffer(rawPayload_bytes_invalid, box_sbhome))
        .to.be.rejectedWith('incorrect amount of bytes, should be 12');
    });

    it('should return error for incomplete sensors', () => {
      box_sbhome.sensors.pop();

      return expect(decoder.decodeBuffer(rawPayload_bytes, box_sbhome))
        .to.be.rejectedWith('box does not contain valid sensors for this profile');
    });

  });
});
