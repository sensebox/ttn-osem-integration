'use strict';

const router = require('express').Router(),
  { Box } = require('openSenseMapAPI/lib/models'),
  transformAndValidateArray = require('openSenseMapAPI/lib/decoding/transformAndValidateArray'),
  decoder = require('../decoder');

router.post('/measurement', (req, res) => {
  const { app_id, dev_id, payload_raw, payload } = req.body;

  if (!dev_id || !app_id || !(payload_raw || payload)) {
    return res.status(422).json({
      code: 422,
      msg: 'malformed request: any of [dev_id, app_id, payload, payload_raw] is missing'
    });
  }

  // look up box for dev_id & app_id DB
  Box.findOne({
    'integrations.ttn.app_id': app_id,
    'integrations.ttn.dev_id': dev_id
  }).catch(msg => Promise.reject({ code: 501, msg }))
  .then(box => {
    if (box === null) {
      return Promise.reject({ code: 404, msg: `no box found for dev_id '${dev_id}' and app_id '${app_id}'`});
    } else {
      req.box = box;
      return Promise.resolve(box);
    }
  })

  // find sensor ids by title
  .then(box => decoder.findSensorIds(box.sensors, {
    temperature: ['temperatur', 'temperature'],
    humidity: ['rel. luftfeuchte', 'luftfeuchtigkeit'],
    pressure: ['luftdruck', 'druck', 'pressure', 'air pressure'],
    lightintensity: ['licht', 'helligkeit', 'beleuchtungsstärke', 'einstrahlung', 'light', 'light intensity'],
    uvlight: ['uv', 'uv-a', 'uv-intensität', 'uv-intensity']
  }).catch(msg  => Promise.reject({code: 422, msg })))

  // decode payload_raw
  .then(sensorMap => {
    // TODO: promisify
    // TODO: already return validated array?
    const measurements = decoder.base64ToMeasurement(payload_raw, sensorMap);
    if (typeof measurements === 'string') { // error
      return Promise.reject({code: 422, msg: `could not decode payload: ${measurements}`});
    } else {
      return Promise.resolve(measurements);
    }
  })

  // transform to array & validate
  .then(measurements => {
    const measureArray = [];
    for (const sensor_id in measurements) {
      if (measurements.hasOwnProperty(sensor_id)) {
        measureArray.push({ sensor_id, value: measurements[sensor_id] });
      }
    }

    return transformAndValidateArray(measureArray)
      .catch(msg => Promise.reject({code: 422, msg}));
  })

  // store measurements in DB
  .then(measurements => {
    return req.box.saveMeasurementsArray(measurements)
      .catch(msg => Promise.reject({code: 501, msg}))
  })
  .then(() => res.status(201).json({code: 201, msg: 'measurements created'}))

  // handle the any error passed in
  .catch(err => {
    const {code, msg } = err;
    if (!code) {
      code = 501;
      msg = err;
    }
    res.status(code).json({ code, msg });
  });
});

module.exports = router;
