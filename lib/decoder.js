'use strict';

class ValueTransformer {
  constructor (transformer, fieldName, byteLength = 2) {
    this.transformer = transformer;
    this.fieldName = fieldName;
    this.byteLength = byteLength;
  }
}

const bytesToInt = (bytes) => {
  let v = 0;
  for (let i = 0; i < bytes.length; i++) {
    v = v | Number(bytes[i] << (i * 8));
  }

  return v;
};

const decodeBytes = (buffer, byteMask) => {
  const result = {};
  let maskLength = 0, currByte = 0;

  // check mask- & buffer-length
  for (const mask of byteMask) {
    maskLength = maskLength + mask.byteLength;
  }

  if (maskLength !== buffer.length) {
    return `incorrect amount of bytes, should be ${maskLength}`;
  }

  // feed each byteMask
  for (const mask of byteMask) {
    const maskedBytes = buffer.slice(currByte, currByte + mask.byteLength);

    result[mask.fieldName] = mask.transformer(maskedBytes);
    currByte = currByte + mask.byteLength;
  }

  return result;
};

const bytesToMeasurement = (buffer, sensorMap) => {
  if (!sensorMap['temperature'] || !sensorMap['uvlight'] || !sensorMap['pressure']
    || !sensorMap['humidity'] || !sensorMap['lightintensity']) {
    return 'sensorMap is incomplete, missing field names.';
  }

  const byteMask = new Set();

  byteMask.add(new ValueTransformer(bytes => {
    return parseFloat((bytesToInt(bytes) / 771 - 18).toFixed(1));
  }, sensorMap['temperature'], 2));

  byteMask.add(new ValueTransformer(bytes => {
    return parseFloat((bytesToInt(bytes) / 1e2).toFixed(1));
  }, sensorMap['humidity'], 2));

  byteMask.add(new ValueTransformer(bytes => {
    return parseFloat((bytesToInt(bytes) / 81.9187 + 300).toFixed(1));
  }, sensorMap['pressure'], 2));

  byteMask.add(new ValueTransformer(bytes => {
    // first byte is modulo, next two are multiplicator
    const [mod, ...times] = bytes;

    return bytesToInt(times) * 255 + bytesToInt([mod]);
  }, sensorMap['lightintensity'], 3));

  byteMask.add(new ValueTransformer(bytes => {
    // first byte is modulo, next two are multiplicator
    const [mod, ...times] = bytes;

    return bytesToInt(times) * 255 + bytesToInt([mod]);
  }, sensorMap['uvlight'], 3));

  return decodeBytes(buffer, byteMask);
};

const base64ToMeasurement = (base64String, sensorMap) => {
  const buf = Buffer.from(base64String, 'base64');

  return bytesToMeasurement(buf, sensorMap);
};



const findSensorIds = function findSensorId (sensors, sensorMatchings) {
  return new Promise(function (resolve, reject) {
    const sensorMap = {};
    const sensorsCopy = sensors.slice();

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
      reject(new Error('box does not contain valid sensors for this profile'));
    }

    resolve(sensorMap);
  });
};


module.exports = {
  bytesToMeasurement,
  base64ToMeasurement,
  findSensorIds
};
