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
        Forms.getAndUpdateFormFileNames(forms, baseUrl);
        return res.json(response);
    } catch (err) {
        return next(err);
    }
});

// redirects to financial statement link if first time requested
router.get('/:id', async function (req, res, next) {
    try {
        let id = req.params.id;
        let form = await Forms.getById(id);
        if (form.form_file_name === null) {
            let updatedFormArr = await Forms.getFormNames([form], baseUrl);
            let updatedForm = updatedFormArr[0];
            if (updatedForm.form_file_name === null) {
                let url = `${baseUrl}${form.form_file_path}`
                return res.redirect(url)
            } else {
                Forms.updateFormFileNames(updatedFormArr);
            }
        }
        let url = `${baseXbrlUrl}${form.form_file_path}${form.form_file_name}`
        return res.redirect(url);
    } catch (err) {
        next(err)
    }
});

module.exports = router;