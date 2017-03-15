# ttn-osem-application

Application for [TheThingsNetwork](https://thethingsnetwork.org), which
provides direct integration with [openSenseMap](https://opensensemap.org)
for LoRa-WAN devices.

It decodes measurements from a uplink payload from the [TTN HTTP Integrations API](https://www.thethingsnetwork.org/docs/applications/http/)
for a registered and configured senseBox, and adds the decoded measurements to
the database.

There are multiple decoding options provided via `profiles`, which may be
easily extended to support other sensor configurations or value transformations.

## decoding profiles
### `sensebox/home`
Decodes messages which contain 5 measurements of all sensors of the senseBox:home.
The correct sensorIds are matched via their titles. Decoding matches the [dragino senseBox:home arduino sketch](https://github.com/sensebox/random-sketches/blob/master/lora/dragino/dragino.ino).

### `lora-serialization`
Allows decoding of messages, which were encoded with the [`lora-serialization` library](https://github.com/thesolarnomad/lora-serialization).
The sub-profiles `temperature`, `humidity`, `uint8`, `uint16` are supported, and matched to a sensor via it's ID. The following config allows decoding of measurements of a sensor like DHT22:
```js
ttn: {
  profile: 'lora-serialization',
  decodeOptions: [
    { sensor_id: '588876b67dd004f79259bd8a', decoder: 'temperature' },
    { sensor_id: '588876b67dd004f79259bd8b', decoder: 'humidity' }
  ]
}
```

TODO: support `unixtime` for measurement timestamps

### `debug`
Simple decoder which decodes a given number of bytes to integer values. Requires a config like
```js
ttn: {
  profile: 'lora-serialization',
  decodeOptions: [3, 1, 2] // specifies the number of bytes to consume for each measurement
}
```
where the measurements are applied to the boxes sensors in the order of `box.sensors`.

### `json`
It's also possible to add measurements which already have been decoded by a [TTN payload function](https://www.thethingsnetwork.org/docs/devices/uno/quick-start.html#monitor--decode-messages).
The property `payload_fields` has to contain JSON in the [format accepted by the openSenseMap-API](https://docs.opensensemap.org/#api-Measurements-postNewMeasurements).

## docs
See `./docs/` or [sensebox.github.io/ttn-osem-application](https://sensebox.github.io/ttn-osem-application).

## dependencies
- `node.js >= 6.x`
- `yarn`
- `mongodb >= 3.x`

## configuration
See [`config.js`](config.js). All options may be overridden by environment
variables.
Currently, the connection string to mongodb must be configured through the
environment variables of the [openSenseMap-API config](https://github.com/sensebox/openSenseMap-API/blob/master/config/index.js):

```bash
OSEM_dbuser=user
OSEM_dbuserpass=pass
# ...or just:
OSEM_dbconnectionstring=mongodb://localhost/OSeM-api
```

## license
MIT, see [`LICENSE`](LICENSE)
