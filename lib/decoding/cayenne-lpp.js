"use strict";

/**
 * This decoding can decode payloads constructed with {@link https://developers.mydevices.com/cayenne/docs/lora/#lora-cayenne-low-power-payload}.
 * @module decoding/cayenne-lpp
 * @license MIT
 */

const { createLogger } = require("../logging"),
  { findSensorIds, applyValueFromMeasurement } = require("./helpers");

const log = createLogger("decoder/cayenne-lpp");

const decodeMessage = function decodeMessage(payload, box) {
  return new Promise((resolve, reject) => {
    // get sensor matchings
    const decodeOptions = box.integrations.ttn.decodeOptions;
    const sensorMatchings = [];

    if (
      !decodeOptions ||
      decodeOptions.constructor !== Array ||
      !decodeOptions.every((opts) => typeof opts === "object")
    ) {
      reject("profile 'cayenne-lpp' requires valid decodeOptions");
    }

    // construct sensorMatchings to find the correct sensorIds
    for (const el of decodeOptions) {
      const match = {};
      if (el.sensor_id) {
        match["_id"] = [el.sensor_id];
      }
      if (el.sensor_title) {
        match["title"] = [el.sensor_title];
      }
      if (el.sensor_type) {
        match["sensorType"] = [el.sensor_type];
      }
      if (el.sensor_unit) {
        match["unit"] = [el.sensor_unit];
      }

      if (!Object.keys(match).length) {
        reject(
          "invalid decodeOptions. requires at least one of [sensor_id, sensor_title, sensor_type]"
        );
      } else {
        sensorMatchings.push(match);
      }
    }

    const sensorIds = findSensorIds(box.sensors, sensorMatchings);

    log.trace(
      {
        sensorMatchings,
        sensorIds
      },
      "matched sensors"
    );

    // loop decodeOptions and read measurements from (by TTN decoded) payload
    // returns 0 if no measurement is found
    const data = decodeOptions.map((decOpt, i) => {
      const value = payload[`${decOpt.decoder}_${decOpt.channel}`] || 0;
      return {
        [sensorIds[i]]:  value
      }
    });

    resolve(data)
  });
}

module.exports = {
  decodeMessage
};
