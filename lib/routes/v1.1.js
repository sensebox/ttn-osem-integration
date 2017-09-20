'use strict';

/**
 * Router for TTN HTTP integrations API v1 and this API v1
 * @module routes/v1_1
 * @license MIT
 */

const router = require('express').Router(),
  { boxFromDevId } = require('../database'),
  decoder = require('../decoding'),
  { createLogger } = require('../logging');

/**
 * express middleware, sending responses & compute reponse time
 *
 * expects res.local to contain { code, data } or an Error
 * expects req.time to be a Date
 * @private
 */
const sendResponse = function sendResponse (req, res, next) {
  let data = res.locals;

  // handle undhandled errors
  if (!data.code) {
    data = { code: 501, msg: data };
  }

  data.msg = data.msg.toString();

  res.status(data.code).json(data);
  res.locals.responseTime = Date.now() - req.time.getTime();

  next();
};

const log = createLogger('webhook-v1.1');

/**
 * express middleware, logging result of a webhook request
 * @private
 */
const logResponse = function logResponse (req, res, next) {
  const { msg, responseTime, code } = res.locals;
  const message = `${code} (${responseTime}ms): ${msg}`;
  if (code >= 500) {
    log.error({ res }, message);
  } else if (code >= 400) {
    log.warn({ res, box: req.box, payload: req.body }, message);
  } else {
    log.info({ res }, message);
  }
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
    Object.assign(res.locals, {
      code: 422,
      msg: 'malformed request: any of [dev_id, app_id, payload_fields, payload_raw] is missing'
    });

    return next();
  }

  // look up box for dev_id & app_id in DB
  boxFromDevId(app_id, dev_id, port)
    .catch(msg => Promise.reject({ code: 404, msg }))
    .then(box => {
      log.debug({ box }, 'matched box');
      req.box = box;

      // decode measurements from request.body, req.box & req.time
      return decoder.decodeRequest(req.body, box, req.time.toISOString())
        .catch(msg => Promise.reject({ code: 422, msg }));
    })

    // store measurements in DB
    .then(measurements => {
      log.debug({ measurements }, 'resulting measurements');

      return req.box.saveMeasurementsArray(measurements)
        .catch(msg => Promise.reject({ code: 422, msg }));
    })

    .then(() => {
      Object.assign(res.locals, { code: 201, msg: 'measurements created' });

      return next();
    })

    // handle any error passed in
    .catch(err => {
      res.locals = err;

      return next();
    });
};

router.post('/', [
  httpIntegrationHandler,
  sendResponse,
  logResponse,
]);

module.exports = router;
