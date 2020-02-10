const db = require('../db');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

class Companies {
    static async loadFromFile(filePath) {
        let companyFilings = fs.readFileSync('./data/xbrl.idx', 'utf8').toString().split(/\n/).map(e => ({
            'cik': parseInt(e.split('|')[0]),
            'companyName': e.split('|')[1],
            'filing': e.split('|')[2],
            'date': e.split('|')[3],
            'folder': e.split('|')[4] ? e.split('|')[4].split(/[/|\-|.]/).reduce((r,e,i) => (i === 2 || i === 5) ? r + e + '/' : (i === 3 || i === 4) ? r + e : r + '', '/') : 0
        }));
        console.log(companyFilings);
    }

    static async addFiling(cik, filing, date, filePath) {
        let result = await db.query(`
        INSERT INTO filings
        (cik, filing, date, filePath)`)
    }

}

module.exports = Filings;