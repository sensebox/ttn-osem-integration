'use strict';

/**
 * Router for TTN HTTP integrations API v1 and this API v1
 * @module routes/v1_1
 * @license MIT
 */

const router = require('express').Router(),
  { boxFromDevId, boxFromBoxId } = require('../database'),
  { TTNError, AuthorizationError, PayloadError } = require('../errors'),
  { getOrRegisterDevice } = require('../ttn'),
  cfg = require('../../config'),
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
  const { message } = r;
  let { code } = r;
  if (
    (r instanceof Error && !(r instanceof TTNError)) || // filter non TTNError.code values
    !code
  ) {
    code = 501;
  }

  res.status(code).json({ code, message });
  res.locals.responseTime = Date.now() - req.time.getTime();

  if (r instanceof TTNError) {
    log.warn({
      res,
      box: req.box,
      payload: req.body,
      url: req.url
    }, message);
  } else if (r.code) {
    log.info({ res, url: req.url }, message);
  } else {
    log.error({
      err: r,
      res,
      box: req.box,
      payload: req.body,
      url: req.url,
    }, message);
  }

  if (typeof next === 'function') {
    return next();
  }
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

const authOpensensemap = function authOpensensemap (req, res, next) {
  const token = req.header('authorization');
  if (token && cfg.authTokens.includes(token.split(' ')[1])) {
    return next();
  }

  res.locals.result = new AuthorizationError();
  sendResponse(req, res);
};

/**
 * returns the device options for a senseBox. if no matching device exists, a new one is registered
 *
 * # box <-> device matching
 * app_id = cfg.ttn.appId
 * dev_id = box._id
 * dev_eui = random
 * app_skey/ nwskey = random
 */
const registerDeviceHandler = function registerDeviceHandler (req, res, next) {
  const { boxId } = req.params;

  // make sure the box actually exists
  return boxFromBoxId(boxId)
    .then(box => {
      req.box = box; // for the logger in sendResponse()
      const dev_eui = box.integrations.ttn ? box.integrations.ttn.dev_eui : '';

      return getOrRegisterDevice(boxId, dev_eui);
    })
    .then(device => {
      res.locals.result = { code: 200, message: device };
      next();
    })
    .catch(err => {
      res.locals.result = err;
      next();
    });
};

router.post('/', [
  httpIntegrationHandler,
  sendResponse,
]);

router.get('/ttndevice/:boxId', [
  authOpensensemap,
  registerDeviceHandler,
  sendResponse,
]);

module.exports = router;
