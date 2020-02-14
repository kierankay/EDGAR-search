const CronJob = require('cron').CronJob;
const Form = require('../models/Filing');
const { baseArchiveUrl, baseXbrlListSavePath } = require('../constants');
const moment = require('moment');


// Fetch and update the daily stock ticker symbols
const tickerJob = new CronJob('0 0 0 * * *', async function () {
    // get list of tickers
    await Companies.load(baseTickerUrl, baseTickerSavePath);

    // parse and load tickers into database
    let companies = await Companies.loadFromFile(baseTickerSavePath);
    await Companies.add(companies);
}, null, true, 'America/Los_Angeles');

// Fetch and update the daily xbrl listings
const xbrlJob = new CronJob('0 5 0 * * *', async function () {
    let currFormListUrl = Form.getCurrFormListUrl(baseArchiveUrl);
    await Form.getFormLists([currFormListUrl], baseXbrlListSavePath);

    let currYear = moment().year();
    let currQtr = moment().quarter();
    let currQtrFileName = `${currYear}-QTR${currQtr}-xbrl.idx`;

    let unNamedForms = await Form.loadFormList(currQtrFileName, baseXbrlListSavePath);
    await Promise.all(unNamedForms.map(async (form) => await Forms.addOne(form)));
    await getAndUpdateFormFileNames(unNamedForms, baseArchiveUrl);
}, null, true, 'America/Los_Angeles');

module.exports = { tickerJob, xbrlJob };