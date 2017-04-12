'use strict';

/**
 * This decoding can decode payloads constructed with {@link https://github.com/thesolarnomad/lora-serialization|lora-serialization}.
 * @module decoding/lora-serialization
 * @license MIT
 */

const loraSerialization = require('lora-serialization').decoder,
  { findSensorIds } = require('./helpers');

/**
 * returns a bufferTransfomer for transformation of a buffer to measurements.
 * The box is required to have a an array of ttn.decodeOptions
 * @see module:decoding~bufferToMeasurements
 * @param {Box} box - The box to retrieve decodeOptions and sensorIds from
 * @return {Array} A bufferTransformer for the box
 * @example <caption>decodeOptions format</caption>
 * ttn: {
 *   profile: 'lora-serialization',
 *   decodeOptions: [{
 *     sensor_id: '588876b67dd004f79259bd8a',
 *     decoder: 'temperature' // one of [temperature, humidity, uint8, uint16]
 *   }, {
 *     // sensor_type, sensor_title, sensor_unit is allowed as well
 *     sensor_type: '588876b67dd004f79259bd8b',
 *     decoder: 'VEML6070'
 *   }]
 * }
 */
const createBufferTransformer = function createBufferTransformer (box) {
  const byteMask = box.integrations.ttn.decodeOptions,
    bufferTransf = [],
    sensorMatchings = [];

  if (!byteMask || byteMask.constructor !== Array) {
    throw new Error('profile \'lora-serialization\' requires valid decodeOptions');
  }

  // construct sensorMatchings to find the correct sensorIds
  for (const el of byteMask) {
    const match = {};
    if (el.sensor_id) {
      match['_id'] = [el.sensor_id];
    }
    if (el.sensor_title) {
      match['title'] = [el.sensor_title];
    }
    if (el.sensor_type) {
      match['sensorType'] = [el.sensor_type];
    }
    if (el.sensor_unit) {
      match['unit'] = [el.sensor_unit];
    }

    if (Object.keys(match).length === 0) {
      throw new Error('invalid decodeOptions. requires at least one of [sensor_id, sensor_title, sensor_type]');
    }
    sensorMatchings.push(match);
  }

  const sensorIds = findSensorIds(box.sensors, sensorMatchings);

  if (Object.keys(sensorIds).length !== byteMask.length) {
    throw new Error('box does not contain sensors mentioned in byteMask');
  }

  for (let i = 0; i < byteMask.length; i++) {
    const sensorId = byteMask[i].sensor_id,
      transformer = loraSerialization[byteMask[i].decoder];

    if (typeof transformer !== 'function' || byteMask[i].decoder === 'decode' || byteMask[i].decoder === 'latLng') {
      throw new Error(`'${byteMask[i].decoder}' is not a supported transformer`);
    }

    bufferTransf.push({
      sensorId: sensorIds[i][i],
      transformer,
      bytes: transformer.BYTES,
    });
  }

  return bufferTransf;
};

module.exports = {
  createBufferTransformer
};
