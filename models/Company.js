const db = require('../db');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

class Companies {
    // static async loadFromFile(filePath) {
    //     let companies = fs.readFileSync('./data/cik_ticker.csv', 'utf8').toString().split(/\n/).map(e => ({
    //         'cik': parseInt(e.split('|')[0]),
    //         'ticker': e.split('|')[1],
    //         'companyName': e.split('|')[2]
    //       }));
    //     Companies.add(companies);
    //     // console.log(companies);
    // }

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
        let companies = fs.readFileSync('./data/ticker.txt', 'utf8').toString().split(/\n/).map(e => ({
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