'use strict';

/**
 * Router for TTN HTTP integrations API v1 and this API v1
 * @module routes/v1_1
 * @license MIT
 */

const router = require('express').Router(),
  { color } = require('console-control-strings'),
  { Box } = require('openSenseMapAPI').models,
  decoder = require('../decoding'),
  cfg = require('../../config');

/**
 * send responses & do logging
 * @private
 * @param {Request} req
 * @param {Response} res
 * @param {Object} data - Format: either String or { code: Number, msg: Any }
 */
const handleResponse = function handleResponse (req, res, data) {
  // handle undhandled errors
  if (!data.code) {
    data = { code: 501, msg: data };
  }

  if (data.code >= cfg.loglevelHTTPcodes[cfg.loglevel]) {
    let codeString = `${color('red')}${data.code}${color('reset')}`;
    if (data.code < cfg.loglevelHTTPcodes['warn']) {
      codeString = `${color('green')}${data.code}${color('reset')}`;
    } else if (data.code < cfg.loglevelHTTPcodes['error']) {
      codeString = `${color('yellow')}${data.code}${color('reset')}`;
    }

    const responseTime = new Date().getTime() - req.time.getTime(),
      boxInfo = {
        dev_id: req.body.dev_id,
        port: req.body.port,
        box: req.box ? req.box._id.toString() : 'unkown',
        profile: req.box ? req.box.integrations.ttn.profile : 'unkown'
      };

    console.log(`  ${codeString} (${responseTime}ms)\t${JSON.stringify(boxInfo)}\n  ${data.msg}\n`);
  }

  return res.status(data.code).json(data);
};

/**
 * Accepts a POST request from the TTN HTTP integrations uplink API, version 1
 * as specified {@link https://www.thethingsnetwork.org/docs/applications/http/|here},
 * and decodes it's payload to store a set of measurements for a box.
 * The box is identified by it's registered values app_id and dev_id.
 * If a box specifies a port, it will only recieve measurements sent on that port.
 * @name 'POST /v1.1'
 * @example
 * curl -X POST -H "content-type: application/json" -d \
 *   '{ "app_id": "asdf", "dev_id": "qwerty", "payload_raw": "kzIrIYzlOycAMgEA" }' \
 *   localhost:3000/v1.1
 */
router.post('/', (req, res) => {
  const { app_id, dev_id, payload_raw, payload_fields, port } = req.body;

  if (
    !dev_id ||
    !app_id ||
    !(payload_raw || payload_fields)
  ) {
    return handleResponse(req, res, {
      code: 422,
      msg: 'malformed request: any of [dev_id, app_id, payload_fields, payload_raw] is missing'
    });
  }

  // look up box for dev_id & app_id in DB
  Box.find({
    'integrations.ttn.app_id': app_id,
    'integrations.ttn.dev_id': dev_id
  }).catch(msg => Promise.reject({ code: 501, msg }))
  .then(boxes => {
    if (!boxes.length) {
      return Promise.reject({ code: 404, msg: `no box found for dev_id '${dev_id}' and app_id '${app_id}'` });
    }

    // filter the boxes by their configured port. also include boxes with undefined port.
    req.box = boxes.filter(box => {
      const p = box.integrations.ttn.port;

      return (p === port || p === undefined);
    })[0];

    if (!req.box) {
      return Promise.reject({ code: 404, msg: `no box found for port ${port}` });
    }

    return decoder.decodeRequest(req)
      .catch(msg => Promise.reject({ code: 422, msg }));
  })

  // store measurements in DB
  .then(measurements => {
    return req.box.saveMeasurementsArray(measurements)
      .catch(msg => Promise.reject({ code: 422, msg }));
  })

  .then(() => handleResponse(req, res, { code: 201, msg: 'measurements created' }))

  // handle any error passed in
  .catch(err => handleResponse(req, res, err));
});

module.exports = router;
