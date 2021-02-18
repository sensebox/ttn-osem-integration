'use strict';

/* eslint-env mocha */

const chakram = require('chakram'),
  expect = chakram.expect;

chakram.addRawPlugin('one', require('chai-things'));

const cfg = require('config'),
  { db: { connect, mongoose }, Box, Measurement } = require('@sensebox/opensensemap-api-models');

// test data
const BASE_URL = `http://localhost:${cfg.port}`,
  box_cayenne = require('./data/ttnv3Box_cayenne.json'),
  TTNv3payload_cayennelpp_valid = require('./data/TTNv3payload_cayennelpp_valid.json'),
  TTNv3payload_cayennelpp_nonexistent = require('./data/TTNv3payload_cayennelpp_nonexistent.json');


describe('TTN HTTP Integration v3 webhook', () => {

  describe('POST /', () => {
    const URL = `${BASE_URL}/v3`;

    const removeBox = function removeBox (dev_id) {
      return Box.findOne({ 'integrations.ttn.dev_id': dev_id })
        .then(function (box) {
          return box ? box.removeSelfAndMeasurements() : Promise.resolve();
        });
    };

    before(function (done) {
      this.timeout(10000);

      // wait for DB connection
      mongoose.set('debug', false);
      connect()
        // delete all testboxes
        .then(() => 
          removeBox(TTNv3payload_cayennelpp_valid.end_device_ids.device_id)
        )
        // reinsert testboxes
        .then(() => Box.initNew(box_cayenne))
        .then(() => done())
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
      return chakram.post(URL, TTNv3payload_cayennelpp_nonexistent).then(res => {
        expect(res).to.have.status(404);

        return chakram.wait();
      });
    });

    it('should respond 201 for valid request payload_raw', () => {
      return chakram.post(URL, TTNv3payload_cayennelpp_valid).then(res => {
        expect(res).to.have.status(201);

        return chakram.wait();
      });
    });

    it('set createdAt to local time if no metadata is provided', () => {
      return Measurement.find({ sensor_id: box_cayenne.sensors[0]._id }).then(measurements => {
        const timeDiff = Date.now() - measurements[0].createdAt.getTime();
        expect(timeDiff).to.be.below(200);

        return chakram.wait();
      });
    });

    // it('set createdAt to TTN time if available', () => {
    //   const time = new Date(Date.now() + 20 * 1000);
    //   TTNv3payload_cayennelpp_valid.received_at = time.toISOString();

    //   return chakram.post(URL, TTNv3payload_cayennelpp_valid)
    //     .then(() => Measurement.find({ sensor_id: box_cayenne.sensors[0]._id }))
    //     .then(measurements => {
    //       const timeSet = measurements.some(m => time.getTime() === m.createdAt.getTime());
    //       expect(timeSet).to.equal(true);

    //       return chakram.wait();
    //     });
    // });

    it('set createdAt to gateway time if available', () => {
      const time = new Date(Date.now() + 40 * 1000);
      TTNv3payload_cayennelpp_valid.uplink_message.rx_metadata = [{
        time: time.toISOString()
      }];

      return chakram.post(URL, TTNv3payload_cayennelpp_valid)
        .then(() => Measurement.find({ sensor_id: box_cayenne.sensors[0]._id }))
        .then(measurements => {
          const timeSet = measurements.some(m => time.getTime() === m.createdAt.getTime());
          expect(timeSet).to.equal(true);

          return chakram.wait();
        });
    });

    it('should respond 201 for valid request payload_fields', () => {
      return chakram.post(URL, TTNv3payload_cayennelpp_valid).then(res => {
        expect(res).to.have.status(201);

        return chakram.wait();
      });
    });

    it('should respond 404 for box filtered by port', () => {
      TTNv3payload_cayennelpp_valid.uplink_message.f_port = 1234;

      return chakram.post(URL, TTNv3payload_cayennelpp_valid).then(res => {
        expect(res).to.have.status(404);

        return chakram.wait();
      });
    });

  });

});
