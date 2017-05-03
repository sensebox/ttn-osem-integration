# ttn-osem-integration

Integration for [openSenseMap](https://opensensemap.org) with [TheThingsNetwork](https://thethingsnetwork.org),
that provides simple measurement upload from LoRa-WAN devices.

It decodes measurements from an uplink payload from the [TTN HTTP Integrations API](https://www.thethingsnetwork.org/docs/applications/http/)
for a registered and configured senseBox, and adds the decoded measurements to
the database.

There are multiple decoding options provided via `profiles`, which may be
easily extended to support other sensor configurations or value transformations.

## configuring a box
To associate a device on the TTN network with a box on the openSenseMap, there is some configuration required on the openSenseMap. The box has to contain a field `box.integrations.ttn` with the following structure:
```js
ttn: {
  // the app_id & dev_id you recieved when registering on TTN
  app_id: 'abcd',
  dev_id: '1234',
  // decode the messages according to this profile format, see below
  profile: 'lora-serialization',
  // optional. some profiles require additional configuration
  decodeOptions: [],
  // optional. if specified, only messages recieved on this LoRa-port are stored
  port: 3,
}
```

### decoding profiles
#### `sensebox/home`
Decodes messages which contain 5 measurements of all sensors of the senseBox:home.
The correct sensorIds are matched via their titles. Decoding matches the [dragino senseBox:home arduino sketch](https://github.com/sensebox/random-sketches/blob/master/lora/dragino/dragino.ino).

#### `lora-serialization`
Allows decoding of messages which were encoded with the [`lora-serialization` library](https://github.com/thesolarnomad/lora-serialization).
The sub-profiles `temperature`, `humidity`, `uint8`, `uint16` are supported, and matched to a sensor via it's `_id`, `sensorType`, `unit`, or `title` properties.
For each sensor one or more matchings may be defined as `sensor_id`, `sensor_title`, `sensor_type`, `sensor_unit`. If one property matches a sensor, the other properties are discarded.

The following example config allows decoding of measurements of a 3 sensors:
```js
ttn: {
  profile: 'lora-serialization',
  decodeOptions: [
    { sensor_unit: '°C', decoder: 'temperature' },
    { sensor_id: '588876b67dd004f79259bd8b', decoder: 'humidity' },
    { sensor_type: 'TSL45315', sensor_title: 'Beleuchtungsstärke', decoder: 'uint16' }
  ]
}
```

#### `debug`
Simple decoder which decodes a given number of bytes to integer values. Requires a config like
```js
ttn: {
  profile: 'lora-serialization',
  decodeOptions: [3, 1, 2] // specifies the number of bytes to consume for each measurement
}
```
where the measurements are applied to the boxes sensors in the order of `box.sensors`.

#### `json`
It's also possible to add measurements which already have been decoded by a [TTN payload function](https://www.thethingsnetwork.org/docs/devices/uno/quick-start.html#monitor--decode-messages).
The property `payload_fields` has to contain JSON in the [format accepted by the openSenseMap-API](https://docs.opensensemap.org/#api-Measurements-postNewMeasurements).
This is the case, if the TTN application has a *Payload Function* defined.

## deployment
There is a `Dockerfile`, as well as an `docker-compose.yml` which includes a mongodb instance.
If you want to run the application directly, you need to have the dependencies listed below installed.
For configuration, see below. Once configured, run
```bash
yarn install
npm start
```

### dependencies
- `node.js >= 6.x`
- `yarn`
- `mongodb >= 3.x`

### configuration
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

## development
- JSDoc documentation can be found under `./docs/` or [sensebox.github.io/ttn-osem-integration](https://sensebox.github.io/ttn-osem-integration). To update it, run `npm run docs`.
- To run the test suite, either run `export OSEM_dbconnectionstring=....; npm run test` while the application is running, or `./run_tests.sh` (requires bash & docker).
- Please follow the existing code style. Double check by running `npm run lint`.

## license
MIT, see [`LICENSE`](LICENSE)
