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
  if (!sensorMap['temperature'] || !sensorMap['uvLight'] || !sensorMap['pressure']
    || !sensorMap['humidity'] || !sensorMap['lightIntensity']) {
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
  }, sensorMap['lightIntensity'], 3));

  byteMask.add(new ValueTransformer(bytes => {
    // first byte is modulo, next two are multiplicator
    const [mod, ...times] = bytes;

    return bytesToInt(times) * 255 + bytesToInt([mod]);
  }, sensorMap['uvLight'], 3));

  return decodeBytes(buffer, byteMask);
};

const base64ToMeasurement = (base64String, sensorMap) => {
  const buf = Buffer.from(base64String, 'base64');

  return bytesToMeasurement(buf, sensorMap);
};

module.exports = {
  bytesToMeasurement: bytesToMeasurement,
  base64ToMeasurement: base64ToMeasurement
};
