'use strict';

const router = require('express').Router(),
  request = require('prequest'),
  cfg = require('../../config'),
  decoder = require('../decoder');

// TODO: access database directly instead of oSeM-API proxy.
//         -> reuse oSeM-API logic

router.post('/measurement', (req, res) => {
  const { app_id, dev_id, payload_raw } = req.body;
  let boxId = null;

  if (app_id !== cfg.ttnAppID) {
    return res.status(422)
      .end(`this is '${cfg.ttnAppID}'. don't ask me about ${app_id}`);
  }

  if (!dev_id || !payload_raw) {
    return res.status(422)
      .end('malformed request: dev_id or payload_raw is missing');
  }

  // look up device_id in oSem-DB (box.ttnID)
  request(`${cfg.osemEndpoint}/boxes`)
    .catch(err => {
      return res.status(501).end(`oSeM-API unavailable: ${err}`);
    })
    .then(boxes => {
      // find the box
      for (const box of boxes) {
        if (box.ttnID === dev_id) {
          return Promise.resolve(box);
        }
      }

      return Promise.reject(`no box found for dev_id '${dev_id}'`);
    })
    .catch(err => {
      return res.status(404).end(err);
    })
    .then(box => {
      boxId = box._id;
      // process sensor ids // FIXME: more robust method than sensor title?
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
        return Promise.reject(measurements);
      }

      return Promise.resolve(measurements);
    })
    .catch(err => {
      return res.status(422).end(`could not decode payload: ${err}`);
    })
    .then(measurements => {
      // post resulting measurements to osem api
      const promises = [];
      for (const sensorId in measurements) { /* eslint guard-for-in: 0 */
        promises.push(request({
          method: 'POST',
          url: `${cfg.osemEndpoint}/boxes/${boxId}/${sensorId}`,
          body: { value: measurements[sensorId] }
        }));
      }

      return Promise.all(promises);
    })
    .catch(err => {
      return res.status(501).end(`could not post measurements to oSeM-API: ${err}`);
    })
    .then(apiRes => {
      // wait for success
      return res.status(201).end(`${apiRes.length} measurements created`);
    });
});

module.exports = router;
