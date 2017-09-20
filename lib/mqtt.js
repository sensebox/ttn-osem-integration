'use strict';

// TODO: hook to register devices in TTN when called from osemApi or something
// - return dev_uid, app_uid, app_key ?

const { data: ttnClient } = require('ttn'),
  cfg = require('../config'),
  { boxFromDevId } = require('./database'),
  decoder = require('./decoding'),
  { createLogger } = require('./logging');

const log = createLogger('mqtt');

const onUplinkMessage = function onUplinkMessage (dev_id, message) {
  const { app_id, payload_raw, payload_fields, port } = message;
  let matchBox;

  // match associated box via dev_uid or dev_id
  boxFromDevId(app_id, dev_id, port)
    .catch(err => Promise.reject(err))
    // decode measurements from request.body, req.box & req.time
    .then(box => {
      log.debug({ box }, `matched box for dev_id ${dev_id}`);
      matchBox = box;

      return decoder.decodeRequest(message, box)
        .catch(err => Promise.reject(err))
    })
    // store result in DB
    .then(measurements => {
      log.debug({ measurements }, 'resulting measurements');

      return matchBox.saveMeasurementsArray(measurements)
        .catch(err => Promise.reject(err))
    })
    .then(() => log.info(`saved measurements for ${dev_id}`))
    .catch(err => log.warn(err));
}

/**
 * connects to the TTN MQTT broker and subscribes to incoming messages.
 * @return {Promise}
 */
const initMqtt = function () {
  return ttnClient(cfg.ttn.appId, cfg.ttn.key)
    .then(function onTTNClient (ttnClient) {
      ttnClient.on('error', function onTTNError (err) {
        log.error({ err }, 'could not connect to TTN');
      });

      ttnClient.on('connect', function onTTNConnection () {
        log.info(`connected to TTN app ${cfg.ttn.appId}`);
      });

      ttnClient.on('uplink', onUplinkMessage);
    });
}

module.exports = {
  initMqtt,
};
