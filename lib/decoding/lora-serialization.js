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
 * @see module:decoding~bufferToMeasurements
 * @param {Box} box - The box to retrieve byteMask and sensorIds from
 * @return {Array} A bufferTransformer for the box
 */
const createBufferTransformer = function createBufferTransformer (box) {
  const byteMask = box.integrations.ttn.decodeOptions.byteMask,
    bufferTransf = [];

  if (!byteMask) {
    throw new Error('profile \'lora-serialization\' requires a valid byteMask');
  }

  const idMatchings = [];
  for (const x of byteMask) {
    idMatchings[x.sensor_id] = x.sensor_id;
  }

  if (Object.keys(findSensorIds(box.sensors, idMatchings, '_id')).length !== byteMask.length) {
    throw new Error('box does not contain sensors mentioned in byteMask');
  }

  // TODO: check if sensors exist. maybe DB validation?

  for (let i = 0; i < byteMask.length; i++) {
    const sensorId = byteMask[i].sensor_id,
      transformer = loraSerialization[byteMask[i].decoder];

    if (typeof transformer !== 'function' || byteMask[i].decoder === 'decode' || byteMask[i].decoder === 'latLng') {
      throw new Error(`${byteMask[i][sensorId]} is not a supported transformer`);
    }

    bufferTransf.push({
      sensorId,
      transformer,
      bytes: transformer.BYTES,
    });
  }

  return bufferTransf;
};

module.exports = {
  createBufferTransformer
};
