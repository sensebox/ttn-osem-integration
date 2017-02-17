# ttn-osem-application
Application for [TheThingsNetwork](https://thethingsnetwork.org), which
provides direct integration with [openSenseMap](https://opensensemap.org)
for LoRa-WAN devices.

> under development.

The current approach is to proxy the oSeM-API with a custom data-decoder.

Future plans include direct operation on the oSeM database. This requires
some separation of the openSenseMap API code though, to reuse existing
database insertion logic.
