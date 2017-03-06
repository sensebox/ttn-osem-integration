'use strict';

const router = require('express').Router(),
  { Box } = require('openSenseMapAPI/lib/models'),
  decodeJSON = require('openSenseMapAPI/lib/decoding/jsonHandler.js').decodeMessage,
  decoder = require('../decoding');

/**
 * Accepts a POST request from the TTN HTTP integrations uplink API, version 1
 * as specified here: https://www.thethingsnetwork.org/docs/applications/http/
 * and decodes it's payload to store a set of measurements for a box.
 * The box is identified by it's registered values app_id and dev_id.
 */
router.post('/measurement', (req, res) => {
  const { app_id, dev_id, payload_raw, payload_fields } = req.body;

  if (!dev_id || !app_id || !(payload_raw || payload_fields)) {
    return res.status(422).json({
      code: 422,
      msg: 'malformed request: any of [dev_id, app_id, payload_fields, payload_raw] is missing'
    });
  }

  // look up box for dev_id & app_id in DB
  Box.findOne({
    'integrations.ttn.app_id': app_id,
    'integrations.ttn.dev_id': dev_id
  }).catch(msg => Promise.reject({ code: 501, msg }))
  .then(box => {
    if (box === null) {
      return Promise.reject({ code: 404, msg: `no box found for dev_id '${dev_id}' and app_id '${app_id}'` });
    }

    let promise;
    req.box = box;

    if (box.integrations.ttn.messageFormat === 'bytes') {
      promise = decoder.decodeBase64(payload_raw, box);
    } else {
      // TODO: unclear if this will ever be used? TTN docs are quite fuzzy..
      promise = decodeJSON(payload_fields);
    }

    return promise.catch(msg => Promise.reject({ code: 422, msg }));
  })

  // store measurements in DB
  .then(measurements => {
    return req.box.saveMeasurementsArray(measurements)
      .catch(msg => Promise.reject({ code: 501, msg }));
  })

  .then(() => res.status(201).json({ code: 201, msg: 'measurements created' }))

  // handle any error passed in
  .catch(err => {
    let { code, msg } = err;
    if (!code) {
      code = 501;
      msg = err;
    }
    res.status(code).json({ code, msg });
  });
});

module.exports = router;
