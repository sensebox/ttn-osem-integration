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

  // test data
  payloadCustom = require('./data/TTNpayload_custom_valid.json'),
  payloadSbhome = require('./data/TTNpayload_sbhome_valid.json'),
  boxCustom = require('./data/ttnBox_custom.json'),
  boxSbhome = require('./data/ttnBox_sbhome.json'),

  profiles = {
    custom: {
      box: JSON.parse(JSON.stringify(boxCustom)),
      payloads: {
        buffer: Buffer.from(payloadCustom.payload_raw, 'base64'),
        base64: payloadCustom.payload_raw
      },
      results: { buffer: null, base64: null }
    },

    sbhome: {
      box: JSON.parse(JSON.stringify(boxSbhome)),
      payloads: {
        buffer: Buffer.from(payloadSbhome.payload_raw, 'base64'),
        base64: payloadSbhome.payload_raw
      },
      results: { buffer: null, base64: null, reference: null }
    }
  };

describe('decoder', () => {

  before(() => {
    // run all the decodings once
    return Promise.all([
      // profile custom
      decoder.decodeBuffer(profiles.custom.payloads.buffer, profiles.custom.box),
      decoder.decodeBase64(profiles.custom.payloads.base64, profiles.custom.box),
      // profile sbhome
      decoder.decodeBuffer(profiles.sbhome.payloads.buffer, profiles.sbhome.box),
      decoder.decodeBase64(profiles.sbhome.payloads.base64, profiles.sbhome.box),
      transformAndValidateArray(referenceImpl(profiles.sbhome.payloads.buffer, {
        temperature: profiles.sbhome.box.sensors[4]._id,
        humidity: profiles.sbhome.box.sensors[3]._id,
        pressure: profiles.sbhome.box.sensors[2]._id,
        lightintensity: profiles.sbhome.box.sensors[1]._id,
        uvlight: profiles.sbhome.box.sensors[0]._id
      }))
    ])
    .then(decodings => {
      // clean up result invariants
      decodings.map(result => result.map(m => {
        delete m._id; delete m.createdAt;
      }));

      profiles.custom.results.buffer = decodings[0];
      profiles.custom.results.base64 = decodings[1];
      profiles.sbhome.results.buffer = decodings[2];
      profiles.sbhome.results.base64 = decodings[3];
      profiles.sbhome.results.reference = decodings[4];
    });
  });

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

    const p = profiles.custom;

    it('should return a valid measurement array', () => {
      expect(p.results.buffer)
        .to.be.an('array').with.lengthOf(3)
        .with.all.have.property('sensor_id')
        .with.all.have.property('value')
        .and.contains.one.with.property('value', '1')
        .and.contains.one.with.property('value', '2')
        .and.contains.one.with.property('value', '3');
    });

    it('should return the same for base64 input', () => {
      expect(p.results.base64).to.deep.equal(p.results.buffer);
    });

    it('should reject a box too long byteMask', () => {
      p.box.sensors.pop();
      p.box.sensors.pop();
      p.box.sensors.pop();

      return expect(decoder.decodeBase64(p.payloads.base64, p.box))
        .to.be.rejectedWith('box requires at least 3 sensors');
    });

    it('should reject a box with missing byteMask', () => {
      delete p.box.integrations.ttn.decodeOptions.byteMask;

      return expect(decoder.decodeBase64(p.payloads.base64, p.box))
        .to.be.rejectedWith('profile \'custom\' requires a valid byteMask');
    });

  });


  describe('profile: sensebox/home', () => {

    const p = profiles.sbhome;

    it('should return a valid measurement array', () => {
      expect(p.results.buffer).to.be.an('array').with.lengthOf(5)
        .with.all.have.property('sensor_id')
        .with.all.have.property('value');
    });

    it('should return same results as reference implementation', () => {
      expect(p.results.buffer).to.deep.equal(p.results.reference);
    });

    it('should decode base64 to measurements with same result', () => {
      expect(p.results.base64).to.deep.equal(p.results.buffer);
    });

    it('should return error for too few bytes', () => {
      return expect(decoder.decodeBuffer(Buffer.from('asdf', 'hex'), p.box))
        .to.be.rejectedWith('incorrect amount of bytes, should be 12');
    });

    it('should return error for incomplete sensors', () => {
      p.box.sensors.pop();

      return expect(decoder.decodeBuffer(p.payloads.buffer, p.box))
        .to.be.rejectedWith('box does not contain valid sensors for this profile');
    });

  });
});
