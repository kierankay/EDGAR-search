const express = require('express');
const Forms = require('../models/Filing');
const Companies = require('../models/Company');
const fs = require('fs');

let baseUrl = 'https://www.sec.gov/Archives/edgar/data';
let baseXbrlUrl = 'https://www.sec.gov/ix?doc=/Archives/edgar/data';

const router = express.Router();

// COMPANY ROUTES

/*
  Fetch a filings for a company by stock ticker
  ex: GET /api/filings/company/ticker/AAPL
*/

router.get('/build/tickers', async function (req, res, next) {
    try {
        let loadFrom = 'https://www.sec.gov/include/ticker.txt';
        let saveTo = './data/tickers';
        // fetch tickers from SEC.gov
        await Companies.load(loadFrom, saveTo);

        // parse and load into database
        let companyFilings = await Companies.loadFromFile(saveTo);
        await Forms.add(companyFilings);
        return res.json({ "message": "built tickers" });
    } catch (err) {
        next(err);
    }
});

router.get('/build/filings', async function (req, res, next) {
    try {
        let baseDataFolder = './data/xbrls'
        let formListUrls = await Forms.buildFormListUrls(baseUrl);

        // build all xbrl lists at ./data/xbrls
        // await Forms.getFormLists(formListUrls);

        let files = fs.readdirSync(baseDataFolder);
        for (let formList of files) {
            let companyForms = await Forms.loadFormList(`${baseDataFolder}/${formList}`);
            await Forms.add(companyForms);
        }
        return res.json({ "message": "built forms" });
    } catch (err) {
        next(err)
    }
});

router.get('/ticker/:ticker', async function (req, res, next) {
    try {
        let { ticker } = req.params;

        // get the CIK number from the ticker symbol
        let cik = await Companies.getCik(ticker);

        // get the filing from the CIK number
        let forms = await Forms.getByCik(cik);

        // sort and return as a JSON object
        forms.sort((a, b) => b.date_filed - a.date_filed);
        let response = { ticker, forms }
        let namedForms = await Forms.getFormNames(forms, baseUrl);
        await Forms.updateFormFileNames(namedForms);
        return res.json(response);
    } catch (err) {
        return next(err);
    }
});

// redirects to financial statement link if first time requested
router.get('/:id', async function (req, res, next) {
    try {
        let id = req.params.id;
        let filing = await Forms.getById(id);
        if (filing.file_url === null) {
            return res.json({ "message": "file not found" });
        }
        let url = `${baseXbrlUrl}${filing.file_location}${filing.file_url}`
        return res.redirect(url);
    } catch (err) {
        next(err)
    }
});

module.exports = router;