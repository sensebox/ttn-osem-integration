const boxCayenneLpp = require('./data/ttnBox_cayennelpp.json');
const payloadCayenneLpp = require('./data/TTNpayload_cayennelpp.json');

const decoder = require('../lib/decoding');

decoder.decodeRequest({body: payloadCayenneLpp, box: boxCayenneLpp}).then(data => console.log(data))