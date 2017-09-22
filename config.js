'use strict';

const e = process.env;

module.exports = {
  port: e['TTN_OSEM_port'] || 3000,

  /**
   * error: only server errors
   * warn:  a summary of requests that didn't succeed
   * info:  a summary of each request
   * debug: show input data, matched box, resulting measurements
   * trace: show intermediate decoding results
   */
  loglevel: e['TTN_OSEM_loglevel'] || 'info',

  /**
   * commaseparated list of IP6 adresses that are allowed to request authenticated routes
   * eg GET /v1.1/ttndevices/:boxId
   * subject to change!
   */
  ipWhitelist: ['::1'].concat(
    e['TTN_OSEM_ipwhitelist'] ? e['TTN_OSEM_ipwhitelist'].split(',') : []
  ),

  ttn: {
    appId: e['TTN_OSEM_ttn_app'],
    key: e['TTN_OSEM_ttn_key'], // the key requires full rights (settings, devices, messages)
  },
};
