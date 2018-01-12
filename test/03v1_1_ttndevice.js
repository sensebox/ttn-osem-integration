'use strict';

/* eslint-env mocha */

const chakram = require('chakram'),
  expect = chakram.expect;

chakram.addRawPlugin('one', require('chai-things'));

const cfg = require('../config'),
  { Box } = require('openSenseMapAPI').models,
  ttnClient = require('ttn').application;

// test data
const BASE_URL = `http://localhost:${cfg.port}/v1.1/ttndevice`,
  box_json = require('./data/ttnBox_json.json');

describe('GET /v1.1/ttndevices/:boxId -- get/register ttn device', () => {
  const headers = {
    headers: { authorization: `Bearer ${cfg.authTokens[0]}` }
  };
  let newDeviceInfo;

  before(function (done) {
    this.timeout(10000);

    // insert testboxes
    Box.initNew(box_json)
      .then(jsonbox => {
        box_json._id = jsonbox._id.toString();

        // make shure no ttn devices exist for these boxes
        return ttnClient(cfg.ttn.appId, cfg.ttn.key);
      })
      .then(app => app.deleteDevice(box_json._id).catch(() => {}))
      .then(() => done());
  });

  after(function (done) {
    this.timeout(10000);
    // remove box and device again
    ttnClient(cfg.ttn.appId, cfg.ttn.key)
      .then(app => app.deleteDevice(box_json._id))
      .then(() => Box.findOne({ '_id': box_json._id }))
      .then(box => box.removeSelfAndMeasurements())
      .then(() => done());
  });

  it('should respond 403 if not authorized', () => {
    return chakram.get(`${BASE_URL}/asdfasdf`).then(res => {
      expect(res).to.have.status(403);
      expect(res.body).to.have.property('code', 403);
      expect(res.body).to.have.property('message');

      return chakram.wait();
    });
  });

  it('should respond 404 for nonexistent boxes', () => {
    return chakram.get(`${BASE_URL}/asdfasdf`, headers).then(res => {
      expect(res).to.have.status(404);
      expect(res.body).to.have.property('code', 404);
      expect(res.body).to.have.property('message');

      return chakram.wait();
    });
  });

  it('should create a TTN device for a box it didnt exist yet', () => {
    return chakram.get(`${BASE_URL}/${box_json._id}`, headers).then(res => {
      expect(res).to.have.status(200);
      expect(res.body).to.have.property('code', 200);
      expect(res.body).to.have.property('message');
      expect(res.body.message).to.have.property('devId', box_json._id);
      expect(res.body.message).to.have.property('appId', cfg.ttn.appId);
      expect(res.body.message).to.have.property('devEui');
      expect(res.body.message).to.have.property('appEui');
      expect(res.body.message).to.have.property('appKey');
      expect(res.body.message).to.have.property('appSKey');
      expect(res.body.message).to.have.property('nwkSKey');
      expect(res.body.message).to.have.property('devAddr');

      newDeviceInfo = res.body.message;

      return chakram.wait();
    });
  });

  it('should return existing TTN device info for a given boxID', () => {
    return chakram.get(`${BASE_URL}/${box_json._id}`, headers).then(res => {
      expect(res).to.have.status(200);
      expect(res.body.message).to.deep.equal(newDeviceInfo);

      return chakram.wait();
    });
  });

});
