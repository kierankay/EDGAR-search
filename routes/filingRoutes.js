const express = require('express');
const Company = require('../models/Filing');

const router = express.Router();

// COMPANY ROUTES

/*
  Fetch a filings for a company by stock ticker
  ex: GET /api/filings/company/ticker/AAPL
*/

router.get('company/ticker/:ticker', async function (req, res, next) {
    try {
        let { ticker } = req.params.ticker;
        let result = await Filings.getFilingsByTicker(ticker);
        return res.json(result);
    } catch (err) {
        return next(err);
    }
});

module.exports = router;