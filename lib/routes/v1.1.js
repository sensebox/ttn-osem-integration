'use strict';

/**
 * Router for TTN HTTP integrations API v1 and this API v1
 * @module routes/v1_1
 * @license MIT
 */

const router = require('express').Router(),
  { boxFromDevId } = require('../database'),
  { TTNError, PayloadError } = require('../errors'),
  decoder = require('../decoding'),
  { createLogger } = require('../logging');

const log = createLogger('webhook-v1.1');

/**
 * express middleware, sending responses & compute reponse time
 *
 * expects res.local to contain { code, data } or an Error
 * expects req.time to be a Date
 * @private
 */
const sendResponse = function sendResponse (req, res, next) {
  const r = res.locals.result;
  let { code, message } = r;

  res.locals.responseTime = Date.now() - req.time.getTime();
  if (r instanceof TTNError) {
    log.warn({ res, box: req.box, payload: req.body }, message);
  } else if (r.code) {
    log.info({ res }, message);
  } else {
    code = 501;
    log.error({ err: r , res, box: req.box, payload: req.body }, message);
  }

  res.status(code).json({ code, message });
  next();
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
const httpIntegrationHandler = function httpIntegrationHandler (req, res, next) {
  const { app_id, dev_id, payload_raw, payload_fields, port } = req.body;

  log.debug({ payload: req.body }, 'payload');

  if (
    !dev_id ||
    !app_id ||
    !(payload_raw || payload_fields)
  ) {
    res.locals.result = new PayloadError('any of [dev_id, app_id, payload_fields, payload_raw] is missing');

    return next();
  }

  // look up box for dev_id & app_id in DB
  boxFromDevId(app_id, dev_id, port)
    .then(box => {
      log.debug({ box }, 'matched box');
      req.box = box;

      // decode measurements from request.body, req.box & req.time
      return decoder.decodeRequest(req.body, box, req.time.toISOString());
    })

    // store measurements in DB
    .then(measurements => {
      log.debug({ measurements }, 'resulting measurements');

      return req.box.saveMeasurementsArray(measurements);
    })

    .then(() => {
      res.locals.result = { code: 201, message: 'measurements created' };

      return next();
    })

    .catch(err => {
      res.locals.result = err;

      return next();
    });
};

router.post('/', [
  httpIntegrationHandler,
  sendResponse,
]);

module.exports = router;
