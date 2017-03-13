'use strict';

const e = process.env;

module.exports = {
  port: e['TTN_OSEM_port'] || 3000,
  loglevel: e['TTN_OSEM_loglevel'] || 'info',
  loglevelHTTPcodes: {
    'info': 100,
    'warn': 300,
    'error': 500
  }
};
