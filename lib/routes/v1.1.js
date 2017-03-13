'use strict';

/**
 * Router for TTN HTTP integrations API v1 and this API v1
 * @module routes/v1_1
 * @license MIT
 */

const router = require('express').Router(),
  color = require('console-control-strings').color,
  { Box } = require('openSenseMapAPI/lib/models'),
  decodeJSON = require('openSenseMapAPI/lib/decoding/jsonHandler.js').decodeMessage,
  decoder = require('../decoding');

const handleResponse = function handleResponse (req, res, data) {
  // handle undhandled errors
  if (!data.code) {
    data = {
      code: 501,
      msg: data
    };
  }

  const responseTime = new Date().getTime() - req.time.getTime(),
    codeString = `${color(data.code >= 400 ? 'red' : 'green')}${data.code}${color('reset')}`,
    boxInfo = {
      dev_id: req.body.dev_id,
      box: req.box ? req.box._id.toString() : 'unkown',
      profile: req.body.payload_fields ? 'JSON' : req.box ? req.box.integrations.ttn.decodeOptions.profile : 'unkown'
    };

  console.log(`  ${codeString} (${responseTime}ms)\t${JSON.stringify(boxInfo)}\n  ${data.msg}\n`);

  return res.status(data.code).json(data);
};


/**
 * Accepts a POST request from the TTN HTTP integrations uplink API, version 1
 * as specified {@link https://www.thethingsnetwork.org/docs/applications/http/|here},
 * and decodes it's payload to store a set of measurements for a box.
 * The box is identified by it's registered values app_id and dev_id.
 * @name 'POST /v1.1/measurement'
 * @example
 * curl -X POST -d \
 *   '{ "app_id": "asdf", "dev_id": "qwerty", "payload_raw": "kzIrIYzlOycAMgEA" }' \
 *   localhost:3000/v1.1/measurement
 */
router.post('/measurement', (req, res) => {
  const { app_id, dev_id, payload_raw, payload_fields } = req.body;

  if (!dev_id || !app_id || !(payload_raw || payload_fields)) {
    return handleResponse(req, res, {
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

  .then(() => handleResponse(req, res, { code: 201, msg: 'measurements created' }))

  // handle any error passed in
  .catch(err => handleResponse(req, res, err));
});

module.exports = router;
