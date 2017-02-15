module.exports = {
  port: process.env['TTN_OSEM_PORT'] || 3000,
  osemEndpoint: process.env['TTN_OSEM_API'] || 'https://api.opensensemap.org'
};
