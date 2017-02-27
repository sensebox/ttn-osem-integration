'use strict';

const router = require('express').Router(),
  { Box } = require('openSenseMapAPI/lib/models'),
  transformAndValidateArray = require('openSenseMapAPI/lib/decoding/transformAndValidateArray'),
  decoder = require('../decoder');

router.post('/measurement', (req, res) => {
  const { app_id, dev_id, payload_raw, payload } = req.body;
  let theBox = null;

  if (!dev_id || !app_id || !(payload_raw || payload)) {

    return res.status(422)
      .json({ code: 422, msg: 'malformed request: any of [dev_id, app_id, payload, payload_raw] is missing' });
  }

  // look up device_id in oSem-DB (box.ttnID)
  return Box.findOne({ 'integrations.ttn.app_id': app_id, 'integrations.ttn.dev_id': dev_id })
    .then(box => {
      if (box === null) {
        return Promise.reject(`404|no box found for dev_id '${dev_id}' and app_id '${app_id}'`);
      }

      theBox = box;

      // find sensor ids by title
      return decoder.findSensorIds(box.sensors, {
        temperature: ['temperatur', 'temperature'],
        humidity: ['rel. luftfeuchte', 'luftfeuchtigkeit'],
        pressure: ['luftdruck', 'druck', 'pressure', 'air pressure'],
        lightintensity: ['licht', 'helligkeit', 'beleuchtungsstärke', 'einstrahlung', 'light', 'light intensity'],
        uvlight: ['uv', 'uv-a', 'uv-intensität', 'uv-intensity']
      });
    })
    // TODO: catch for each error type? -> no need to encode status code in error msg
    .then(sensorMap => {

      // decode payload_raw
      // TODO: promisify
      // TODO:  already return validated array?
      const measurements = decoder.base64ToMeasurement(payload_raw, sensorMap);
      if (typeof measurements === 'string') { // error
        return Promise.reject(`422|could not decode payload: ${measurements}`);
      }

      // transform to array
      const measureArray = [];
      for (const sensor_id in measurements) {
        if (measurements.hasOwnProperty(sensor_id)) {
          measureArray.push({ sensor_id, value: measurements[sensor_id] });
        }
      }

      return transformAndValidateArray(measureArray);
    })
    .then(measurements => {
      return theBox.saveMeasurementsArray(measurements);
    })
    .then(() => {
      return res.status(201).end('measurements created');
    })
    .catch(err => {
      const [code, msg] = err.split('|');
      res.status(code).json({ code, msg });
    })
});

module.exports = router;
