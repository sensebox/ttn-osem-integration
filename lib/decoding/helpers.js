'use strict';

/**
 * NOTE: LSB comes first
 * @param {Array} bytes
 */
const bytesToInt = function bytesToInt (bytes) {
  let v = 0;
  for (let i = 0; i < bytes.length; i++) {
    v = v | Number(bytes[i] << (i * 8));
  }

  return v;
};

/**
 *
 * @param {Array} sensors
 * @param {Object} sensorMatchings
 * @param {String} sensorProp
 */
const findSensorIds = function findSensorIds (sensors, sensorMatchings, sensorProp = 'title') {
  const sensorMap = {}, sensorsCopy = sensors.slice();

  for (const phenomenon in sensorMatchings) {
    const aliases = sensorMatchings[phenomenon];

    for (let i = 0; i < sensorsCopy.length; i++) {
      const prop = sensorsCopy[i][sensorProp].toLowerCase();
      if (aliases.includes(prop)) {
        sensorMap[phenomenon] = sensorsCopy[i]._id.toString();
        sensorsCopy.splice(i, 1);
        break;
      }
    }
  }

  return sensorMap;
};

module.exports = {
  bytesToInt,
  findSensorIds
};

