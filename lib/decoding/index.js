'use strict';

const transformAndValidateArray = require('openSenseMapAPI/lib/decoding/transformAndValidateArray'),
  profileCustom = require('./custom'),
  profileSenseboxhome = require('./sensebox_home');

const profiles = {
  'custom': profileCustom,
  'sensebox/home': profileSenseboxhome
};

const bufferToMeasurements = function bufferToMeasurements (buffer, bufferTransformer) {
  const result = [];
  let maskLength = 0, currByte = 0;

  // check mask- & buffer-length
  for (const mask of bufferTransformer) {
    maskLength = maskLength + mask.bytes;
  }

  if (maskLength !== buffer.length) {
    throw new Error(`incorrect amount of bytes, should be ${maskLength}`);
  }

  // feed each bufferTransformer element
  for (const mask of bufferTransformer) {
    const maskedBytes = buffer.slice(currByte, currByte + mask.bytes);

    result.push({
      sensor_id: mask.sensorId,
      value: mask.transformer(maskedBytes)
    });

    currByte = currByte + mask.bytes;
  }

  return result;
};


const decodeBuffer = function decodeBuffer (buffer, box) {
  return Promise.resolve().then(function () {
    // should never be thrown, as we find a box by it's ttn config
    if (!box.integrations || !box.integrations.ttn || !box.integrations.ttn.decodeOptions) {
      throw new Error('box has no TTN configuration');
    }

    // select bufferTransformer according to profile
    const profile = profiles[box.integrations.ttn.decodeOptions.profile];

    if (!profile) {
      throw new Error(`profile ${box.integrations.ttn.decodeOptions.profile} is not supported`);
    }

    const bufferTransformer = profile.createBufferTransformer(box);

    // decode buffer using bufferTransformer
    const measurements = bufferToMeasurements(buffer, bufferTransformer);

    // validate decoded measurements
    return transformAndValidateArray(measurements);
  });
};

const decodeBase64 = function decodeBase64 (base64String, box) {
  const buf = Buffer.from(base64String, 'base64');

  return decodeBuffer(buf, box);
};

module.exports = {
  decodeBuffer,
  decodeBase64
};
