const express = require('express');
const Company = require('../models/Company');

const router = express.Router();

// COMPANY ROUTES

/*
  Fetch a company's filings
  ex: GET /api/companies/AAPL
*/

router.get('/ticker/:ticker', async function (req, res, next) {
    try {
        let { ticker } = req.params.ticker;
        let result = await Company.getFilingsByTicker(ticker);
        return res.json(result);
    } catch (err) {
        return next(err);
    }
});

module.exports = router;