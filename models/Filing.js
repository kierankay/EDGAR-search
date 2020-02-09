const db = require('../db');
const axios = require('axios');
const cheerio = require('cheerio');

class Filings {
    static async loadByTicker(ticker) {
        let searchResult = await axios.get(`https://www.sec.gov/cgi-bin/browse-edgar?CIK=${ticker}&Find=Search&owner=exclude&action=getcompany`);
        let searchHtmlBody = searchResult.data;
        let $s = cheerio.load(searchHtmlBody);
        let filingTable = $s('.tableFile2').children().children();
        let filings = filingTable.map((i, e) => ({
            'filing': $s(e).children().html().trim(),
            'link': decodeURI($s(e).children().nextAll().html().trim().split(/"/)[1]),
            'description': $s(e).children().nextAll().nextAll().text().trim().split(/\s{2,}/)[0],
            'filing_date': $s(e).children().nextAll().nextAll().nextAll().html().trim(),
            'file_film_link': decodeURI($s(e).children().nextAll().nextAll().nextAll().nextAll().html().trim().split(/"/)[1]),
            'file_film_number': $s(e).children().nextAll().nextAll().nextAll().nextAll().text().trim(),
        })).get();
        return filings;
    }
}

module.exports = Filings;