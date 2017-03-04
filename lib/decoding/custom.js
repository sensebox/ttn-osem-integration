'use strict';

const { bytesToInt } = require('./helpers');

// TODO: docs
// TODO: only supports int values. add divisor to support floats?

const createBufferTransformer = function createBufferTransformer (box) {
  const byteMask = box.integrations.ttn.decodeOptions.byteMask,
    transformer = [];

  if (!byteMask) {
    throw new Error('profile \'custom\' requires a valid byteMask');
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
