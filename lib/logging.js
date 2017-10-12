'use strict';

const bunyan = require('bunyan');
const cfg = require('../config');

const logger = bunyan.createLogger({
  name: 'ttn-osem-integration',
  level: cfg.loglevel,
  serializers: {
    req: bunyan.stdSerializers.req,
    err: bunyan.stdSerializers.err,
    box (box) {
      return box
        ? { id: box._id, sensors: box.sensors, ttn: box.integrations.ttn }
        : {};
    },
    res (res) {
      const { responseTime, result: { code } } = res.locals;

      return { responseTime, code };
    },
  }
});

/**
 * Creates a bunyan logger that inherits some global settings
 * @private
 * @param {string} component name for the logger, stored in the logfield `component`
 * @param {*} [options] bunyan options to be passed to the logger
 * @return a bunyan logger
 */
const createLogger = function createLogger (component, options) {
  return logger.child(Object.assign({ component }, options));
};

module.exports = {
  createLogger,
};
