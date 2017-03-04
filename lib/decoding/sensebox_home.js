'use strict';

const { bytesToInt, findSensorIds } = require('./helpers');

const sensorMatchings = {
  temperature: ['temperatur', 'temperature'],
  humidity: ['rel. luftfeuchte', 'luftfeuchtigkeit'],
  pressure: ['luftdruck', 'druck', 'pressure', 'air pressure'],
  lightintensity: ['licht', 'helligkeit', 'beleuchtungsstärke', 'einstrahlung', 'light', 'light intensity'],
  uvlight: ['uv', 'uv-a', 'uv-intensität', 'uv-intensity']
};

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
    }
  ];

  return transformer;
};

module.exports = {
  createBufferTransformer
};
