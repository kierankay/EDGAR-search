const db = require('../db');
const axios = require('axios');
const fs = require('fs');

class Companies {

    static async load(loadFrom, saveTo) {
        let result = await axios.get(loadFrom);
        let resultData = result.data
        if (!fs.existsSync(`${saveTo}`)) {
            fs.mkdirSync(`${saveTo}`, { recursive: false });
        }
        fs.writeFileSync(`${saveTo}/tickers.txt`, resultData);
    }

    static async loadFromFile(filePath) {
        let companies = fs.readFileSync(`${filePath}/tickers.txt`, 'utf8').toString().split(/\n/).map(e => ({
            'cik': parseInt(e.split(/\s+/)[1]),
            'ticker': e.split(/\s+/)[0]
        }));
        return companies;
    }

    static async add(companies) {
        companies.forEach((e) => (Companies.addOne(e)));
    }

    //
    // DATABASE METHODS
    //

    static async getCik(ticker) {
        let result = await db.query(`
        SELECT *
        FROM companies
        WHERE ticker = $1`,
            [ticker]);
        let cik = result.rows[0].cik;
        return cik;
    }

    static async addOne(company) {
        let { cik, ticker } = company
        let result = await db.query(`
        INSERT INTO companies
        (cik, ticker)
        VALUES ($1, $2)`, [cik, ticker]
        );
    }

}

module.exports = Companies;