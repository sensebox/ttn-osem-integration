'use strict';

/**
 * @module decoding/helpers
 * @license MIT
 */

/**
 * Transforms an array of bytes into an integer value.
 * NOTE: uses little endian; LSB comes first!
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
 * Matches the _ids of a set of sensors to a given set of properties.
 * @param {Array} sensors - Set of sensors as specified in Box.sensors
 * @param {Object} sensorMatchings - defines a set of allowed values for one
 *        or more properties. Once a property matches, the others are ignored.
 * @return {Object} Key-value pairs for each property of sensorMatchings and
 *         the matched sensorIds. If a match was not found, the key is not included.
 * @example <caption>sensorMatchings</caption>
 * {
 *   humidity: {
 *     title: ['rel. luftfeuchte', 'luftfeuchtigkeit', 'humidity'],
 *     type: ['HDC1008']
 *   },
 *   pressure: {
 *     title: ['luftdruck', 'druck', 'pressure', 'air pressure'],
 *     unit: ['°C', '°F']
 *   }
 * }
 * @example <caption>result</caption>
 * {
 *   humidity: '588876b67dd004f79259bd8a',
 *   pressure: '588876b67dd004f79259bd8b'
 * }
 */
const findSensorIds = function findSensorIds (sensors, sensorMatchings) {
  const sensorMap = {}, sensorsCopy = sensors.slice();

  // for each sensorId to find
  for (const phenomenon in sensorMatchings) {

    // for each sensor variable to look up
    for (const sensorProp in sensorMatchings[phenomenon]) {

      const aliases = sensorMatchings[phenomenon][sensorProp].map(a => a.toLowerCase());
      let foundIt = false;

      // for each unmatched sensor
      for (let i = 0; i < sensorsCopy.length; i++) {
        if (!sensorsCopy[i][sensorProp]) {
          continue;
        }

        const prop = sensorsCopy[i][sensorProp].toString().toLowerCase();

        if (aliases.includes(prop)) {
          sensorMap[phenomenon] = sensorsCopy[i]._id.toString();
          sensorsCopy.splice(i, 1);
          foundIt = true;
          break;
        }
      }

      // don't check the other properties, if one did match
      if (foundIt) {
        break;
      }
    }
  }

  return sensorMap;
};

/**
 * returns a function for the bufferTransformer onResult hook, which applies the
 * value of the measurement from `sensorId` to the `property` of all other measurements.
 * The used measurement is removed from the result.
 * If a transformer function is passed, the value will be passed trough the function.
 * @private
 */
const applyValueFromMeasurement = function applyValueFromMeasurement (sensorId, property, transformer) {
  return function (measurements) {
    let value;

    // find "measurement" from the unixtime decoder
    // and discard it.
    for (let k = 0; k < measurements.length; k++) {
      if (measurements[k].sensor_id === sensorId) {
        value = transformer(measurements[k].value) || measurements[k].value;
        measurements.splice(k, 1);
        break;
      }
    }

    // apply the value to all remaining measurements
    for (const m of measurements) {
      m[property] = value;
    }
  };
};

module.exports = {
  applyValueFromMeasurement,
  bytesToInt,
  findSensorIds
};

