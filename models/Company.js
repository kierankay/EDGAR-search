const db = require('../db');
const axios = require('axios');
const fs = require('fs');

class Companies {
    static async load(from, to) {
        let result = await axios.get(from);
        let resultData = result.data
        if (!fs.existsSync(`to`)) {
            fs.mkdirSync(`to`, { recursive: false });
        }
        fs.writeFileSync(`${to}/tickers.txt`, resultData);
    }

    static async getCik(ticker) {
        let result = await db.query(`
        SELECT *
        FROM companies
        WHERE ticker = $1`,
            [ticker]);
        let cik = result.rows[0].cik;
        return cik;
    }

    static async loadFromFile(filePath) {
        let companies = fs.readFileSync(filePath, 'utf8').toString().split(/\n/).map(e => ({
            'cik': parseInt(e.split(/\s+/)[1]),
            'ticker': e.split(/\s+/)[0]
        }));
        Companies.add(companies);
    }

    static async addOne(company) {
        let { cik, ticker } = company
        let result = await db.query(`
        INSERT INTO companies
        (cik, ticker)
        VALUES ($1, $2)`, [cik, ticker]
        );
    }

    static async add(companies) {
        companies.forEach((e) => (Companies.addOne(e)));
    }

}

module.exports = Companies;