const db = require('../db');

class Filings {
    static async getByCompanyTicker(ticker) {
        let upperTicker = ticker.toUpperCase();
        return upperTicker
    }
}

module.exports = Filings;