'use strict';

const sensorMatchings = {
  temperature: ['temperatur', 'temperature'],
  humidity: ['rel. luftfeuchte', 'luftfeuchtigkeit'],
  pressure: ['luftdruck', 'druck', 'pressure', 'air pressure'],
  lightintensity: ['licht', 'helligkeit', 'beleuchtungsstärke', 'einstrahlung', 'light', 'light intensity'],
  uvlight: ['uv', 'uv-a', 'uv-intensität', 'uv-intensity']
};

const bytesToInt = function (bytes) {
  let v = 0;
  for (let i = 0; i < bytes.length; i++) {
    v = v | Number(bytes[i] << (i * 8));
  }

  return v;
};

const findSensorIds = function findSensorIds (sensors, sensorMatchings) {
  const sensorMap = {}, sensorsCopy = sensors.slice();

  for (const phenomenon in sensorMatchings) {
    const aliases = sensorMatchings[phenomenon];

    for (let i = 0; i < sensorsCopy.length; i++) {
      const title = sensorsCopy[i].title.toLowerCase();
      if (aliases.includes(title)) {
        sensorMap[phenomenon] = sensorsCopy[i]._id.toString();
        sensorsCopy.splice(i, 1);
        break;
      }
    }
  }

  if (Object.keys(sensorMap).length !== Object.keys(sensorMatchings).length) {
    throw new Error('box does not contain valid sensors for this profile');
  }

  return sensorMap;
};


const createBufferTransformer = function createBufferTransformer (box) {
  const sensorMap = findSensorIds(box.sensors, sensorMatchings);

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
