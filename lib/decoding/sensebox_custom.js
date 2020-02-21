'use strict';

/**
 * This decoding profile decodes the measurements for the sensors of the
 * senseBox with a custom setup.
 * @module decoding/sensebox_custom
 * @license MIT
 */

const { bytesToInt, findSensorIds } = require('./helpers');
const loraSerialization = require('lora-serialization').decoder;

// alternative titles recognized for the sensors
const sensorMatchings = {
  temperature: {
    title: ['temperatur', 'temperature'],
  },
  humidity: {
    title: ['rel. luftfeuchte', 'luftfeuchtigkeit', 'humidity']
  },
  pressure: {
    title: ['luftdruck', 'druck', 'pressure', 'air pressure']
  },
  lightintensity: {
    title: ['licht', 'helligkeit', 'beleuchtungsstärke', 'einstrahlung', 'light', 'light intensity']
  },
  uvlight: {
    title: ['uv', 'uv-a', 'uv-intensität', 'uv-intensity']
  },
  soilTemperature: {
    title: ['bodentemperatur', 'boden temperatur', 'temperatur boden', 'soiltemperature', 'soil temperature']
  },
  soilMoisture: {
    title: ['bodenfeuchte', 'boden feuchte', 'feuchte boden', 'bodenfeuchtigkeit', 'boden feuchtigkeit', 'feuchtigkeit boden', 'soilmoisture', 'soil moisture']
  },
  pm25: {
    title: ['pm2.5', 'pm2,5', 'pm25', 'pm 2.5', 'pm 2,5', 'pm 25']
  },
  pm10: {
    title: ['pm10', 'pm 10']
  },
  soundlevel: {
    title: ['lautstärke', 'sound level', 'schallpegel', 'schall pegel']
  }
};

/**
 * returns a bufferTransfomer for transformation of a buffer to measurements.
 * @see module:decoding~bufferToMeasurements
 * @param {Box} box - The box to retrieve sensorIds from
 * @return {Array} A bufferTransformer for the box
 */
const createBufferTransformer = function createBufferTransformer (box) {
  const sensorMap = findSensorIds(box.sensors, sensorMatchings);

  const transformer = [];

  // eslint-disable-next-line guard-for-in
  for (const prop in sensorMap) {
    switch (prop) {
    case 'temperature':
      transformer.push({
        sensorId: sensorMap['temperature'],
        bytes: 2,
        transformer: bytes => loraSerialization.temperature(bytes)
      });
      break;
    case 'humidity':
      transformer.push({
        sensorId: sensorMap['humidity'],
        bytes: 2,
        transformer: bytes => loraSerialization.humidity(bytes)
      });
      break;
    case 'pressure':
      transformer.push({
        sensorId: sensorMap['pressure'],
        bytes: 2,
        transformer: bytes => parseFloat((bytesToInt(bytes) / 81.9187 + 300).toFixed(1))
      });
      break;
    case 'lightintensity':
      transformer.push({
        sensorId: sensorMap['lightintensity'],
        bytes: 3,
        transformer (bytes) {
          const [mod, ...times] = bytes;

          return bytesToInt(times) * 255 + bytesToInt([mod]);
        }
      });
      break;
    case 'uvlight':
      transformer.push({
        sensorId: sensorMap['uvlight'],
        bytes: 3,
        transformer (bytes) {
          const [mod, ...times] = bytes;

          return bytesToInt(times) * 255 + bytesToInt([mod]);
        }
      });
      break;
    case 'soilTemperature':
      transformer.push({
        sensorId: sensorMap['soilTemperature'],
        bytes: 2,
        transformer: bytes => loraSerialization.temperature(bytes)
      });
      break;
    case 'soilMoisture':
      transformer.push({
        sensorId: sensorMap['soilMoisture'],
        bytes: 2,
        transformer: bytes => loraSerialization.humidity(bytes)
      });
      break;
    case 'soundlevel':
      transformer.push({
        sensorId: sensorMap['soundlevel'],
        bytes: 2,
        transformer: bytes => parseFloat((bytesToInt(bytes) / 1e2).toFixed(1))
      });
      break;
    }
  }

  return transformer;
};

module.exports = {
  createBufferTransformer
};
