const express = require('express');
const Filings = require('../models/Filing');
const Companies = require('../models/Company');
const fs = require('fs');

const router = express.Router();

// COMPANY ROUTES

/*
  Fetch a filings for a company by stock ticker
  ex: GET /api/filings/company/ticker/AAPL
*/

router.get('/build/tickers', async function (req, res, next) {
    let loadFrom = 'https://www.sec.gov/include/ticker.txt';
    let saveTo = './data/tickers';
    // fetch tickers from SEC.gov
    await Companies.load(loadFrom, saveTo);

    // parse and load into database
    await Companies.loadFromFile(saveTo);
    return res.json({"message": "built tickers"});
});

router.get('/build/filings', async function (req, res, next) {
    let baseUrl = 'https://www.sec.gov/Archives/edgar/full-index/';
    let baseDataFolder = './data/xbrls'
    let filingUrls = await Filings.buildFilingsURLs(baseUrl);

    // build all xbrl lists at ./data/xbrls
    // await Filings.fetchAllFilings(filingUrls);

    let files = fs.readdirSync(baseDataFolder);

    for (let file of files) {
        await Filings.loadFromFile(`${baseDataFolder}/${file}`);
    }
    return res.json({"message": "built files"});
});

router.get('/ticker/:ticker', async function (req, res, next) {
    try {
        let { ticker } = req.params;
        // let result = await Companies.loadFromFile(ticker);
        // let result = await Filings.loadFromFile(ticker);
        let cik = await Companies.getCik(ticker);
        let filing = await Filings.get(cik);
        let response = { ticker, filings: filing }
        return res.json(response);
    } catch (err) {
        return next(err);
    }
});

module.exports = router;