const {baseTimeoutMs} = require('../constants');

async function timeout(ms = baseTimeoutMs) {
    return await new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = timeout;