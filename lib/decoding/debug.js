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

/**
 * returns a bufferTransfomer for transformation of a buffer to measurements.
 * @see module:decoding~bufferToMeasurements
 * @param {Box} box - The box to retrieve byteMask and sensorIds from
 * @return {Array} A bufferTransformer for the box
 */
const createBufferTransformer = function createBufferTransformer (box) {
  const byteMask = box.integrations.ttn.decodeOptions.byteMask,
    transformer = [];

  if (!byteMask) {
    throw new Error('profile \'debug\' requires a valid byteMask');
  }

  if (box.sensors.length < byteMask.length) {
    throw new Error(`box requires at least ${byteMask.length} sensors`);
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
