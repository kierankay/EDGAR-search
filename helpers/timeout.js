async function timeout(ms = 1000) {
    return await new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = timeout;