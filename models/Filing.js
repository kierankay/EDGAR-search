const db = require('../db');
const axios = require('axios');
const cheerio = require('cheerio');

class Filings {
    static async loadByCompanyTicker(ticker) {
        let result = await axios.get(`https://www.sec.gov/cgi-bin/browse-edgar?CIK=${ticker}&Find=Search&owner=exclude&action=getcompany`);
        let htmlBody = result.data;
        let $ = cheerio.load(htmlBody);
        let filingTable = $('.tableFile2').children().children();
        let filings = filingTable.map((i, e) => ({
            'filing': $(e).children().html().trim(),
            'link': decodeURI($(e).children().nextAll().html().trim().split(/"/)[1]),
            'description': $(e).children().nextAll().nextAll().text().trim().split(/\s{2,}/)[0],
            'filing_date': $(e).children().nextAll().nextAll().nextAll().html().trim(),
            'file_film_link': decodeURI($(e).children().nextAll().nextAll().nextAll().nextAll().html().trim().split(/"/)[1]),
            'file_film_number': $(e).children().nextAll().nextAll().nextAll().nextAll().text().trim(),
        })).get();
        return filings
    }
}

module.exports = Filings;