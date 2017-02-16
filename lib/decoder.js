'use strict';

//const bytesToInt = (bytes) => {
function bytesToInt(bytes) {
  let v = 0;
  for (let i = 0; i < bytes.length; i++) {
    v |= +(bytes[i] << (i * 8));
  }
  return v;
};

class ValueTransformer {
  constructor(transformer, fieldName, byteLength = 2) {
    this.byteLength = byteLength;
    this.fieldName = fieldName;
    this.transformer = transformer;
  }
}

const decodeBytes = (buffer, byteMask) => {
  const result = {};
  let maskLength = 0, currByte = 0;

  // check mask- & buffer-length
  for (const mask of byteMask) {
    maskLength += mask.byteLength;
  }

  if (maskLength !== buffer.length) {
    return `incorrect amount of bytes, should be ${maskLength}`;
  }

  // feed each byteMask
  for (const mask of byteMask) {
    const maskedBytes = buffer.slice(currByte, currByte + mask.byteLength);

    result[mask.fieldName] = mask.transformer(maskedBytes);
    currByte += mask.byteLength;
  }

  return result;
};

const bytesToMeasurement = (buffer, sensorMap) => {
  const byteMask = new Set();

  byteMask.add(new ValueTransformer(bytes => {
    const int = bytesToInt(bytes);
    return parseFloat(((int / 771) - 18).toFixed(1));
  }, sensorMap['temperature'], 2));

  byteMask.add(new ValueTransformer(bytes => {
    const int = bytesToInt(bytes);
    return parseFloat(((int / 81.9187) + 300).toFixed(1));
  }, sensorMap['pressure'], 2));

  byteMask.add(new ValueTransformer(bytes => {
    const int = bytesToInt(bytes);
    return int / 1e2;
  }, sensorMap['humidity'], 2));

  byteMask.add(new ValueTransformer(bytes => {
    // first byte is modulo, next two are multiplicator
    // FIXME: proper byte decoding via LSB & MSB reordering (1,2,0) ?
    const [mod, ...times] = bytes;
    return bytesToInt(times) * 255 + bytesToInt(mod);
  }, sensorMap['uvLight'], 3));

  byteMask.add(new ValueTransformer(bytes => {
    // first byte is modulo, next two are multiplicator
    // FIXME: proper byte decoding via LSB & MSB reordering (1,2,0) ?
    const [mod, ...times] = bytes;
    return bytesToInt(times) * 255 + bytesToInt(mod);
  }, sensorMap['lightIntensity'], 3));

  console.log(decodeBytes(buffer, byteMask));
};

const base64ToMeasurement = (base64, sensorMap) => {
  const buf = Buffer.from(base64, 'base64');

  return bytesToMeasurement(buf, sensorMap);
};

module.exports = {
  bytesToMeasurement: bytesToMeasurement,
  base64ToMeasurement: base64ToMeasurement
};
