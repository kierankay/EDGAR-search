const db = require('../db');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

class Filings {

    // static async loadByTicker(ticker) {
    //     let searchResult = await axios.get(`https://www.sec.gov/cgi-bin/browse-edgar?CIK=${ticker}&Find=Search&owner=exclude&action=getcompany`);
    //     let searchHtmlBody = searchResult.data;
    //     let $s = cheerio.load(searchHtmlBody);
    //     let filingTable = $s('.tableFile2').children().children();
    //     let filings = filingTable.map((i, e) => ({
    //         'filing': $s(e).children().html().trim(),
    //         'link': decodeURI($s(e).children().nextAll().html().trim().split(/"/)[1]),
    //         'description': $s(e).children().nextAll().nextAll().text().trim().split(/\s{2,}/)[0],
    //         'filing_date': $s(e).children().nextAll().nextAll().nextAll().html().trim(),
    //         'file_film_link': decodeURI($s(e).children().nextAll().nextAll().nextAll().nextAll().html().trim().split(/"/)[1]),
    //         'file_film_number': $s(e).children().nextAll().nextAll().nextAll().nextAll().text().trim(),
    //     })).get();
    //     return filings;
    // }

    static async loadFromFile(filePath) {
        let companyFilings = fs.readFileSync('./data/xbrl.idx', 'utf8').toString().split(/\n/).map(e => ({
            'cik': parseInt(e.split('|')[0]),
            'companyName': e.split('|')[1],
            'fileType': e.split('|')[2],
            'date': e.split('|')[3],
            'fileUrl': e.split('|')[4] ? e.split('|')[4].split(/[/|\-|.]/).reduce((r, e, i) => (i === 2 || i === 5) ? r + e + '/' : (i === 3 || i === 4) ? r + e : r + '', '/') : 0
        }));
        // console.log(companyFilings);
        this.add(companyFilings);
    }

    static async addOne(file) {
        try {
            let { cik, fileType, date, fileUrl } = file
            if (!isNaN(cik)) {
                let result = await db.query(`
            INSERT INTO filings
            (cik, form_type, date_filed, file_location)
            VALUES ($1, $2, $3, $4)`, [cik, fileType, date, fileUrl]
                );
            }
        } catch (err) {
            console.log(file, err.detail);
        }
    }

    static async add(file) {
        file.forEach((e) => (Filings.addOne(e)));
    }

    static async get(cik) {
        let result = await db.query(`
        SELECT *
        FROM filings
        WHERE cik = $1
        `, [cik]);
        return result.rows;
    }

}

module.exports = Filings;