'use strict';

const decodeMeasureBytes = (buffer) => {
  // TODO
  for (const byte of buffer.entries()) {
    // iterate ALL the bytes!
  }

  return {
    humidity: 1,
    temperature: 2,
    lightIntensity: 3,
    uvLight: 4,
    pressure: 5
  };
};

const decodeMeasureBase64 = (base64) => {
  const buf = Buffer.from(base64, 'base64');

  return decodeMeasureBytes(buf);
};

module.exports = {
  decodeMeasureBytes: decodeMeasureBytes,
  decodeMeasureBase64: decodeMeasureBase64
};
