'use strict';

/**
 * @module decoding/helpers
 */

/**
 * Transforms an array of bytes into an integer value.
 * NOTE: LSB comes first!
 * @param {Array} bytes - data to transform
 * @return {Number}
 */
const bytesToInt = function bytesToInt (bytes) {
  let v = 0;
  for (let i = 0; i < bytes.length; i++) {
    v = v | Number(bytes[i] << (i * 8));
  }

  return v;
};

/**
 * Matches the _ids of a set of sensors to a given set of options.
 * @param {Array} sensors - Set of sensors as specified in Box.sensors
 * @param {Object} sensorMatchings - defines a set of allowed values for each property
 * @param {String} [sensorProp=title] - Property on which the sensorMatchings are tested
 * @return {Object} Key-value pairs for the input property name of sensorMatchings and
 *         the matched sensorIds. If a matching was not found, the key is not included.
 * @example <caption>sensorMatchings</caption>
 * {
 *   humidity: ['rel. luftfeuchte', 'luftfeuchtigkeit', 'humidity'],
 *   pressure: ['luftdruck', 'druck', 'pressure', 'air pressure'],
 * }
 * @example <caption>result</caption>
 * {
 *   humidity: '588876b67dd004f79259bd8a',
 *   pressure: '588876b67dd004f79259bd8b'
 * }
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

