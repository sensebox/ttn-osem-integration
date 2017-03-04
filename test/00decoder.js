'use strict';

/* eslint-env mocha */

// chakram breaks chai somehow, so chai tests have to run before chakram tests

const chai = require('chai'),
  expect = chai.expect;

chai.use(require('chai-things'));
chai.use(require('chai-as-promised'));

const decoder = require('../lib/decoding'),
  transformAndValidateArray = require('openSenseMapAPI/lib/decoding/transformAndValidateArray'),
  referenceImpl = require('./data/decoderReferenceImplementation'),

  box_sbhome = JSON.parse(JSON.stringify(require('./data/ttnBox_sbhome.json'))),
  box_custom = JSON.parse(JSON.stringify(require('./data/ttnBox_custom.json'))),
  payload_sbhome = require('./data/TTNpayload_sbhome_valid.json'),
  payload_custom = require('./data/TTNpayload_custom_valid.json');

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

    before(function() {
      box_custom.sensors.map(s => {
        s._id = s.title;

        return s;
      });
    });

    it('should return a valid measurement array', () => {
      return expect(decoder.decodeBuffer(Buffer.from(payload_custom.payload_raw, 'base64'), box_custom))
        .to.eventually.be.an('array').with.lengthOf(3)
        .to.eventually.all.have.property('sensor_id')
        .to.eventually.all.have.property('value')
        //.to.deep.equal
    });

    it('should return the same for base64 input', () => {
      decoder.decodeBase64(payload_custom.payload_raw, box_custom).then(console.log);

      return expect(decoder.decodeBase64(payload_custom.payload_raw, box_custom))
        .to.eventually.be.an('array').with.lengthOf(3)
        .to.eventually.all.have.property('sensor_id')
        .to.eventually.all.have.property('value')
    });

    it('should reject a box too long byteMask', () => {
      box_custom.sensors.pop();
      box_custom.sensors.pop();

      return expect(decoder.decodeBase64(payload_custom.payload_raw, {
        sensors: [{}, {}],
        integrations: { ttn: { decodeOptions: { profile: 'custom', byteMask: [1,2,3,4] } } }
      })).to.be.rejectedWith('box requires at least 4 sensors');
    });

    it('should reject a box with missing byteMask', () => {
      delete box_custom.integrations.ttn.decodeOptions.byteMask;

      return expect(decoder.decodeBase64(payload_custom.payload_raw, box_custom))
        .to.be.rejectedWith('profile \'custom\' requires a valid byteMask');
    });

  });


  describe('profile: sensebox/home', () => {

    const rawPayload_bytes = Buffer.from(payload_sbhome.payload_raw, 'base64');

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
        decoder.decodeBase64(payload_sbhome.payload_raw, box_sbhome)
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

    // TODO: actually valid for any decoding profile
    it('should decode base64 to measurements with same result', () => {
      expect(decoderResultBase64).to.deep.equal(decoderResultBytes);
    });

    // TODO: actually valid for any decoding profile
    it('should return error for too few bytes', () => {
      return expect(decoder.decodeBuffer(Buffer.from('asdf', 'hex'), box_sbhome))
        .to.be.rejectedWith('incorrect amount of bytes, should be 12');
    });

    it('should return error for incomplete sensors', () => {
      box_sbhome.sensors.pop();

      return expect(decoder.decodeBuffer(rawPayload_bytes, box_sbhome))
        .to.be.rejectedWith('box does not contain valid sensors for this profile');
    });

  });
});
