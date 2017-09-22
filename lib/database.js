'use strict';

const { Box } = require('openSenseMapAPI').models;
const { BoxNotFoundError } = require('./errors');

/**
 * look up a Box in the database for a given ttn configuration
 * @param {string} app_id
 * @param {string} dev_id
 * @param {string} [port]
 */
const boxFromDevId = function boxFromDevId (app_id, dev_id, port) {
  return Box.find({
    'integrations.ttn.app_id': app_id,
    'integrations.ttn.dev_id': dev_id
  })
    .then(boxes => {
      if (!boxes.length) {
        throw new BoxNotFoundError(`for dev_id '${dev_id}' and app_id '${app_id}'`);
      }

      // filter the boxes by their configured port.
      // also include boxes with undefined port.
      const box = boxes.filter(box => {
        const p = box.integrations.ttn.port;

        return (p === port || p === undefined);
      })[0];

      if (!box) {
        throw new BoxNotFoundError(`for port ${port}`);
      }

      return box;
    });
};

module.exports = {
  boxFromDevId,
}
