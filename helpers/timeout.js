const { baseTimeoutMs } = require('../constants');

async function timeout(ms = baseTimeoutMs) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = timeout;
