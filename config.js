'use strict';

const e = process.env;

module.exports = {
  port: e['TTN_OSEM_PORT'] || 3000,
  osemEndpoint: e['TTN_OSEM_API'] || 'https://api.opensensemap.org'
};
