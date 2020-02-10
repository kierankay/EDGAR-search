const express = require('express');
const Filings = require('../models/Filing');
const Companies = require('../models/Company');

const router = express.Router();

// COMPANY ROUTES

/*
  Fetch a filings for a company by stock ticker
  ex: GET /api/filings/company/ticker/AAPL
*/

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