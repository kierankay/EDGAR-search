const express = require('express');
const Filings = require('../models/Filing');

const router = express.Router();

// COMPANY ROUTES

/*
  Fetch a filings for a company by stock ticker
  ex: GET /api/filings/company/ticker/AAPL
*/

router.get('/', async function (req, res, next) {
    try {
        return res.json('hello');
    } catch (err) {
        return next(err);
    }
});

router.get('/company/ticker/:ticker', async function (req, res, next) {
    try {
        let { ticker } = req.params;
        let result = await Filings.getByCompanyTicker(ticker);
        return res.json(result);
    } catch (err) {
        return next(err);
    }
});

module.exports = router;