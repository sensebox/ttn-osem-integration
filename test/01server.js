'use strict';

/* eslint-env mocha */

const chakram = require('chakram'),
  expect = chakram.expect;

//const app = require('../index'); // running server does not handle `mocha -w` well
const cfg = require('../config');

// test data
const BASE_URL = `http://localhost:${cfg.port}`;

describe('server runs', () => {

  it('should respond 404 on baseurl', () => {
    const res = chakram.head(BASE_URL);

    return expect(res).to.have.status(404);
  });

  // TODO: check for existence of headers

});
