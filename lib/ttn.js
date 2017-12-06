'use strict';

const { data, application, key } = require('ttn');

const cfg = require('../config');
const { boxFromBoxId } = require('./database');
const { TTNError } = require('./errors');
const decoder = require('./decoding');
const { createLogger } = require('./logging');

const log = createLogger('ttn');

const onUplinkMessage = function onUplinkMessage (dev_id, message) {
  let matchBox;

  // match associated box via dev_id === box._id
  boxFromBoxId(dev_id, { lean: false })
    // decode measurements from request.body, req.box & req.time
    .then(box => {
      log.debug({ box }, `matched box for dev_id ${dev_id}`);
      matchBox = box;

      return decoder.decodeRequest(message, box);
    })
    // store result in DB
    .then(measurements => {
      log.debug({ measurements }, 'resulting measurements');

      return matchBox.saveMeasurementsArray(measurements);
    })
    .then(() => log.info(`saved measurements for ${dev_id}`))
    .catch(err => {
      if (err instanceof TTNError) {
        log.warn({ err }, 'could not handle uplink message');
      } else {
        log.error({ err });
      }
    });
};

/**
 * connects to the TTN MQTT broker and subscribes to incoming messages.
 * @return {Promise}
 */
const initMqtt = function initMqtt () {
  mqttClient = data(cfg.ttn.appId, cfg.ttn.key)
    .then(client => {
      client.on('error', function onTTNError (err) {
        log.error({ err }, 'could not connect to TTN');
      });

      client.on('connect', function onTTNConnection () {
        log.info(`connected to TTN app ${cfg.ttn.appId}`);
      });

      client.on('uplink', onUplinkMessage);

      return client;
    });

  return mqttClient;
};

/**
 * ressolves the application at any TTN handler
 * @return {Promise}
 */
const initApp = function initApp () {
  const { appId, key } = cfg.ttn;
  appClient = application(appId, key)
    .then(client => {
      // to register devices, we need the apps EUI,
      // which we fetch once from the account server
      return client.getEUIs()
        .then(euis => {
          log.info({ euis }, `resolved TTN app ${appId}`);
          client.appEui = euis[0];

          return client;
        });
    });

  return appClient;
};

// getters that return a Promise for the clients but initialize them only once
let mqttClient, appClient;
const getApp = () => appClient || initApp();
const getMqtt = () => mqttClient || initMqtt();

/**
 * get a TTN device registered at cfg.ttn.appId. If it does not exist,
 * a new device is created with randomized keys and boxId === dev_id.
 * IDEA: maintain local device cache, and check it first?
 * @param {string} boxId
 * @param {string} [dev_eui] - The EUI of the device if known
 * @return {Promise} resolves with the device data
 */
const getOrRegisterDevice = function getOrRegisterDevice (boxId, dev_eui) {

  let app;

  return getApp()
    .then(ttnApp => {
      app = ttnApp;

      return app.device(boxId);
    })
    // the device likely wasn't found, let's create it
    .catch(err => {
      if (err.message !== `handler:device:${cfg.ttn.appId}:${boxId} not found`) {
        throw new Error(`could not find a device for box ${boxId}: ${err.message}`);
      }

      log.info(`box ${boxId} has no TTN device, registering a new one`);

      // as the enduser has no control over this, we
      // apply settings that work for most situations
      const deviceOpts = {
        // devEui is normally assigned to hardware by lora chip vendor.
        // if that value is unknown, we generate a pseudo unique ID.
        // user generated euis must be prefixed with 0x00.
        devEui: dev_eui || `00${key(7)}`,
        appEui: app.appEui,
        disableFCntCheck: true,

        appKey: key(16), // OTAA key

        // ABP keys. OTAA should be used, but we assign keys just in case
        nwkSKey: key(16),
        appSKey: key(16),
        // normally uniquely choosen by network server with prefix 0x2601
        devAddr: `2601${key(2)}`,
      };

      return app.registerDevice(boxId, deviceOpts)
        // still need to fetch the device data
        .then(() => app.device(boxId));
    });
};

module.exports = {
  getMqtt,
  getApp,
  getOrRegisterDevice,
};
