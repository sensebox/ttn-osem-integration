'use strict';

/**
 * This decoding profile is meant as a general starting point for profiles.
 * It decodes the buffer according to a custom byteMask, and transforms the
 * data to integer values.
 * The byteMask defines the amount of bytes to consume for each measurement.
 * It is applied to the sensors in the order they are defined.
 * @module decoding/debug
 * @license MIT
 */

const { bytesToInt } = require('./helpers');
const { DecodingError } = require('../errors');

/**
 * returns a bufferTransfomer for transformation of a buffer to measurements.
 * @see module:decoding~bufferToMeasurements
 * @param {Box} box - The box to retrieve byteMask and sensorIds from
 * @return {Array} A bufferTransformer for the box
 * @example <caption>decodeOptions format</caption>
 * ttn: {
 *   profile: 'debug',
 *   // use first 3 bytes for first sensor, 4th byte for second, next two bytes for third sensor
 *   decodeOptions: [3, 1, 2]
 * }
 */
const createBufferTransformer = function createBufferTransformer (box) {
  const byteMask = box.integrations.ttn.decodeOptions,
    transformer = [];

  if (!byteMask) {
    throw new DecodingError('box requires a valid byteMask', 'debug');
  }

  if (box.sensors.length < byteMask.length) {
    throw new DecodingError(`box requires at least ${byteMask.length} sensors`, 'debug');
  }

  for (let i = 0; i < byteMask.length; i++) {
    transformer.push({
      sensorId: box.sensors[i]._id.toString(),
      bytes: byteMask[i],
      transformer: bytesToInt
    });
  }

  return transformer;
};

module.exports = {
  createBufferTransformer
};
