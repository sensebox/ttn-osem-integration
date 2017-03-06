# ttn-osem-application

Application for [TheThingsNetwork](https://thethingsnetwork.org), which
provides direct integration with [openSenseMap](https://opensensemap.org)
for LoRa-WAN devices.

It decodes measurements from a uplink payload from the [TTN HTTP Integrations API](https://www.thethingsnetwork.org/docs/applications/http/)
for a registered and configured senseBox, and adds the decoded measurements to
the database.

There are multiple decoding options provided via `profiles`, which may be
easily extended to support other sensor configurations or value transformations.

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
GPL-3, see [`LICENSE`](LICENSE)
