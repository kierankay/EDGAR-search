async function timeout(ms) {
    return await new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = timeout;