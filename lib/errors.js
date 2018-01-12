'use strict';

/**
 * All errors handled by the app must inherit from {@link class:TTNError|TTNError}
 * and should be defined here for easier discovery.
 * Where applicable, the error subclass should set an HTTP status code
 * on `this.code`.
 *
 * @module errors
 * @license MIT
 */

/**
 * All errors handled by the app must inherit from TTNError
 * and should be defined here for easier discovery.
 * @param {any} message
 */
class TTNError extends Error { }

/**
 * Thrown when a request is not authorized.
 */
class AuthorizationError extends TTNError {
  constructor () {
    super('Not Authorized');
    this.code = 403;
  }
}

/**
 * Thrown with { code: 404 } when a box was not found in DB.
 * @param {string} message
 */
class BoxNotFoundError extends TTNError {
  constructor (message) {
    super(`No box found ${message}`);
    this.code = 404;
  }
}

/**
 * Thrown with { code: 400 } when the received payload was malformed.
 * @param {string} message
 */
class PayloadError extends TTNError {
  constructor (message) {
    super(`Invalid payload: ${message}`);
    this.code = 400;
  }
}

/**
 * Thrown with { code: 400 } when the received payload content could not be parsed.
 * @param {string} message
 * @param {string} decoder The name of the decoder that is erroring
 */
class DecodingError extends PayloadError {
  constructor (message, decoder = 'generic') {
    super(`${message} (${decoder} decoder)`);
    this.component = decoder;
  }
}

/**
 * Specialized error for the lora-serialization decoder
 * @param {string} message
 */
class LoraError extends DecodingError {
  constructor (message) {
    super(message, 'lora-serialization');
  }
}

module.exports = {
  TTNError,
  AuthorizationError,
  BoxNotFoundError,
  PayloadError,
  DecodingError,
  LoraError,
};
