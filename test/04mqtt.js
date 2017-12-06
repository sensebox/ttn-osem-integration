'use strict';

/* eslint-env mocha */

const chakram = require('chakram'),
  expect = chakram.expect,
  { promisify } = require('util');

chakram.addRawPlugin('one', require('chai-things'));

const cfg = require('../config'),
  exec = promisify(require('child_process').exec),
  { Box, Measurement } = require('openSenseMapAPI').models;


const simulateUplink = (dev_id, payload) => exec(`ttnctl devices simulate "${dev_id}" "${payload}"`);

const createBox = ttnConfig => ({
  exposure: 'mobile',
  location: [11.531, 48.096],
  model: 'homeWifi',
  name: 'testbox - ttn mqtt',
  ttn: Object.assign({ app_id: cfg.ttn.appId, dev_id: 'PLACEHOLDER' }, ttnConfig),
});

const registerDevice = box => {
  const url = `http://localhost:${cfg.port}/v1.1/ttndevice/${box._id}`,
    opts = {
      headers: { authorization: `Bearer ${cfg.authTokens[0]}` },
    };

  return chakram.get(url, opts).then(res => {
    expect(res).to.have.status(200);

    return res.body.message;
  });
};

const registerBoxAndDevice = ttnOpts => {
  const result = { box: {}, device: {} };

  return Box.initNew(createBox(ttnOpts))
    .then(box => {
      result.box = box;

      return registerDevice(box);
    })
    .then(device => {
      result.device = device;

      return result;
    });
};

const deleteBoxAndDevice = (o) => {
  return o.box.removeSelfAndMeasurements()
    .then(() => exec(`echo 'yes' | ttnctl device delete ${o.device.devId}`));
};

const wait = duration => new Promise(res => { setTimeout(() => res(), duration); });

// HOWTO test end to end behaviour?
// log messages, connection on startup, log disconnection, reconnect..
describe('TTN MQTT subscription', () => {

  let box_json, box_sbhome, box_nottn;

  before(function (done) {
    this.timeout(5000);

    // check if ttnctl is available and ready for use
    exec(`ttnctl application select "${cfg.ttn.appId}"`)
      .catch(err => {
        if (/not found/.test(err.message)) {
          console.error('ttnctl executable not available, skipping mqtt end2end tests.');
        } else if (/user login/.test(err.stdout)) {
          console.error('ttnctl not ready. please log in first with `ttnctl user login`');
        } else {
          console.error(err);
        }

        this.skip(); // this = mocha before() handler
        throw err;
      })
      // insert test boxes
      .then(() => Promise.all([
        registerBoxAndDevice({ profile: 'sensebox/home' }),
        registerBoxAndDevice({ profile: 'json' }),
        registerBoxAndDevice({}),
      ]))
      .then(boxes => {
        box_sbhome = boxes[0];
        box_json = boxes[1];
        box_nottn = boxes[2];
        done();
      })
      .catch(() => done()); // error is expected from setupTtnctl
  });

  after(function (done) {
    // if we skipped these tests..
    if (!(box_sbhome && box_json && box_nottn)) {
      return done();
    }

    this.timeout(5000);
    deleteBoxAndDevice(box_sbhome)
      .then(() => deleteBoxAndDevice(box_json))
      .then(() => deleteBoxAndDevice(box_nottn))
      .then(() => done());
  });

  it('should store measurements for valid payloads', function () {
    this.timeout(10000);
    let measurementCount = null;

    return Measurement.count({})
      .then(count => { measurementCount = count; })
      .then(() => simulateUplink(box_sbhome.device.devId, '93322b218ce53b2700320100'))
      .then(() => simulateUplink(box_sbhome.device.devId, '93322b218ce53b2700320100'))
      // wait for mqtt message to be received and handled:
      .then(() => wait(1000))
      .then(() => Measurement.count({}))
      .then(count => {
        expect(count).to.equal(measurementCount + 2 * 5);
      });
  });

  // ie: it should not *crash* / throw errors. no way to check this though currently
  it('should ignore messages with invalid payload', function () {
    this.timeout(10000);
    let measurementCount = null;

    return Measurement.count({})
      .then(count => { measurementCount = count; })
      .then(() => simulateUplink(box_sbhome.device.devId, '93322b218ce5'))
      .then(() => simulateUplink(box_sbhome.device.devId, '93322b218ce570032010001122334455'))
      // wait for mqtt message to be received and handled:
      .then(() => wait(1000))
      .then(() => Measurement.count({}))
      .then(count => {
        expect(count).to.equal(measurementCount);
      });

  });

  it('should ignore devices whose box has no valid ttn config', function () {
    this.timeout(10000);
    let measurementCount = null;

    return Measurement.count({})
      .then(count => { measurementCount = count; })
      .then(() => simulateUplink(box_nottn.device.devId, '012345'))
      .then(() => simulateUplink(box_nottn.device.devId, '012345'))
      .then(() => wait(1000))
      .then(() => Measurement.count({}))
      .then(count => {
        expect(count).to.equal(measurementCount);
      });
  });

  it('should ignore measurements for boxes with profile: json', function () {
    this.timeout(10000);
    let measurementCount = null;

    return Measurement.count({})
      .then(count => { measurementCount = count; })
      .then(() => simulateUplink(box_json.device.devId, '012345'))
      .then(() => simulateUplink(box_json.device.devId, '012345'))
      .then(() => wait(1000))
      .then(() => Measurement.count({}))
      .then(count => {
        expect(count).to.equal(measurementCount);
      });
  });

  it('should ignore devices whose box can\'t be found', function () {
    this.timeout(10000);
    let measurementCount = null;

    return Measurement.count({})
      .then(count => { measurementCount = count; })
      .then(() => exec('ttnctl devices register testmqttasdf'))
      .then(() => simulateUplink('testmqttasdf', '012345'))
      .then(() => simulateUplink('testmqttasdf', '012345'))
      .then(() => wait(1000))
      .then(() => Measurement.count({}))
      .then(count => {
        expect(count).to.equal(measurementCount);

        return exec('echo yes | ttnctl devices delete testmqttasdf');
      });
  });

});
