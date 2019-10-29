'use strict';

/**
 * This decoding profile decodes the measurements for the sensors of the
 * senseBox:home (temperature, humidity, pressure, lightintensity, uvlight) the fine dust sensor(sds...).
 * It applies value transformation fitting for {@link https://github.com/sensebox/random-sketches/blob/master/lora/dragino/dragino.ino|this arduino sketch}.
 * @module decoding/home_sds
 * @license MIT
 */

const { bytesToInt, findSensorIds } = require('./helpers');

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
  pm10: {
    title:['pm10','Feinstaub PM10']
  },
  pm25: {
    title:['pm25','Feinstaub PM25']
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

  if (Object.keys(sensorMap).length !== Object.keys(sensorMatchings).length) {
    throw new Error('box does not contain valid sensors for this profile');
  }

  const transformer = [
    {
      sensorId: sensorMap['temperature'],
      bytes: 2,
      transformer: bytes => parseFloat((bytesToInt(bytes) / 771 - 18).toFixed(1))
    },
    {
      sensorId: sensorMap['humidity'],
      bytes: 2,
      transformer: bytes => parseFloat((bytesToInt(bytes) / 1e2).toFixed(1))
    },
    {
      sensorId: sensorMap['pressure'],
      bytes: 2,
      transformer: bytes => parseFloat((bytesToInt(bytes) / 81.9187 + 300).toFixed(1))
    },
    {
      sensorId: sensorMap['lightintensity'],
      bytes: 3,
      transformer (bytes) {
        const [mod, ...times] = bytes;

        return bytesToInt(times) * 255 + bytesToInt([mod]);
      }
    },
    {
      sensorId: sensorMap['uvlight'],
      bytes: 3,
      transformer (bytes) {
        const [mod, ...times] = bytes;

        return bytesToInt(times) * 255 + bytesToInt([mod]);
      }
    },
    {
      sensorId: sensorMap['pm10'],
      bytes: 2,
      transformer: bytes => parseFloat((bytesToInt(bytes) / 10).toFixed(1))
    },
    {
      sensorId: sensorMap['pm25'],
      bytes:2,
      transformer: bytes => parseFloat((bytesToInt(bytes)/10).toFixed(1))
    }
  ];

  return transformer;
};

module.exports = {
  createBufferTransformer
};
