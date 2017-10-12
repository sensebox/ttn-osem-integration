'use strict';

/**
 * All errors handled by the app must inherit from TTNError
 * and should be defined here for easier discovery.
 */
class TTNError extends Error { }

class BoxNotFoundError extends TTNError {
  constructor (message) {
    super(`No box found ${message}`);
    this.code = 404;
  }
}

class PayloadError extends TTNError {
  constructor (message) {
    super(`Invalid payload: ${message}`);
    this.code = 422;
  }
}

class DecodingError extends PayloadError {
  constructor (message, decoder = 'generic') {
    super(`${message} (${decoder} decoder)`);
    this.component = decoder;
  }
}

class LoraError extends DecodingError {
  constructor (message) {
    super(message, 'lora-serialization');
  }
}


module.exports = {
  TTNError,
  BoxNotFoundError,
  PayloadError,
  DecodingError,
  LoraError,
};
