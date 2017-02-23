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
      .end('malformed request: any of [dev_id, app_id, payload, payload_raw] is missing');
  }

  // look up device_id in oSem-DB (box.ttnID)
  return Box.findOne({ 'integrations.ttn.app_id': app_id, 'integrations.ttn.dev_id': dev_id })
    .then(box => {
      if (box === null) {
        return res.status(404).end(`no box found for dev_id '${dev_id}' and app_id '${app_id}'`);
      }

      theBox = box;

      // process sensor ids // FIXME: more robust method than sensor title?
      // TODO: catch unmatched sensor with response
      const sensorMap = {
        temperature: box.sensors.find(s => s.title === 'Temperatur')._id,
        humidity: box.sensors.find(s => s.title === 'rel. Luftfeuchte')._id,
        pressure: box.sensors.find(s => s.title === 'Luftdruck')._id,
        uvLight: box.sensors.find(s => s.title === 'UV-Intensität')._id,
        lightIntensity: box.sensors.find(s => s.title === 'Beleuchtungsstärke')._id
      };

      // decode payload_raw
      const measurements = decoder.base64ToMeasurement(payload_raw, sensorMap);
      if (typeof measurements === 'string') { // error
        return res.status(422).end(`could not decode payload: ${measurements}`);
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
      return res.status(501).end(err);
    });
});

module.exports = router;
