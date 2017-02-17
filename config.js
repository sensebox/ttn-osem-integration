'use strict';

const e = process.env;

module.exports = {
  port: e['TTN_OSEM_PORT'] || 3000,
  ttnAppID: e['TTN_OSEM_APPID'] || 'sensebox-ifgi',
  osemEndpoint: e['TTN_OSEM_API'] || 'https://api.osem.vo1d.space'
};
