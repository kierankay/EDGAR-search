const express = require('express');
const Forms = require('../models/Form');
const Companies = require('../models/Company');
const fs = require('fs');

const { baseArchiveUrl,
	baseXbrlUrl,
	baseXbrlListSavePath,
	baseTickerUrl,
	baseTickerSavePath,
	baseIdxArchiveUrl } = require('../constants');

const router = express.Router();

// FORM ROUTES

/*
	Fetch lists of stock tickers by CIK, save to disk,
	and load them into the database
	ex: GET /api/forms/build/tickers
*/

router.get('/build/tickers', async function (req, res, next) {
	try {
		// fetch tickers from SEC.gov
		await Companies.load(baseTickerUrl, baseTickerSavePath);

		// parse and load into database
		let companies = await Companies.loadFromFile(baseTickerSavePath);
		await Companies.add(companies);
		return res.json({ "message": "built tickers" });
	} catch (err) {
		next(err);
	}
});

/*
	Fetch lists of filed forms from EDGAR
	Save them locally, and parse them into the forms table
	ex: GET /api/forms/build/forms
*/

router.get('/build/forms', async function (req, res, next) {
	try {
		let formListUrls = Forms.buildFormListUrls(baseIdxArchiveUrl);

		// build all xbrl lists at ./data/xbrls
		// await Forms.getFormLists(formListUrls, baseXbrlListSavePath);

		let files = fs.readdirSync(baseXbrlListSavePath);

		async function syncFileDump(files) {
			let currFile = files.shift();
			let companyForms = await Forms.loadFormList(currFile, baseXbrlListSavePath);
			let responses = [];
			companyForms.forEach(function(form) {
				let resp = Forms.addOne(form);
				responses.push(resp);
			})

			await Promise.all(responses);

			if (files.length > 0) {
				syncFileDump(files);
			}
		}

		syncFileDump(files);

		return res.json({ "message": "building forms, this will take several minutes" });
	} catch (err) {
		next(err)
	}
});

/*
	Return an array of forms filed based on ticker symbol
	ex: GET /api/forms/ticker/aapl

	Response:
	{
		"ticker": "aapl",
		"forms": [
			{
				"id": 362965,
				"cik": 320193,
				"form_type": "10-Q",
				"date_filed": "2020-01-29T08:00:00.000Z",
				"form_file_path": "/320193/000032019320000010/",
				"form_file_name": "a10-qexhibit31112282019.htm",
				"date_last_searched": null
			},
		]
	}
*/

router.get('/ticker/:ticker', async function (req, res, next) {
	try {
		let { ticker } = req.params;

		// get the CIK number from the ticker symbol
		let cik = await Companies.getCik(ticker);
		if (cik === undefined) {
			return res.json({ 'error': 'not a valid ticker symbol' })
		}
		// get the filing from the CIK number
		let forms = await Forms.getByCik(cik);

		// sort and return as a JSON object
		forms.sort((a, b) => b.date_filed - a.date_filed);
		let response = { ticker, forms }
		// Get and update form file names to the database
		Forms.getAndUpdateFormFileNames(forms, baseArchiveUrl);
		return res.json(response);
	} catch (err) {
		return next(err);
	}
});

/*
	Returns a link to the xbrl view of a financial statement
	or to the statement's containing folder if no document is found
	ex: GET /api/forms/362966

	Response:
	301 Redirect to https://www.sec.gov/ix?doc=/Archives/edgar/data/897723/000110465920007134/tm205870-1_8k.htm
	302 Redirect to https://www.sec.gov/ix?doc=/Archives/edgar/data/897723/000110465920007134/
*/

// redirects to financial statement link if first time requested
router.get('/:id', async function (req, res, next) {
	try {
		let id = req.params.id;
		let form = await Forms.getById(id);
		let formNameIsNull = form.form_file_name === null;
		let formDateIsNull = form.date_last_searched === null;
		// If the form file hasn't been searched before, then check for the file name
		// If the file name cannot be found then redirect to the parent folder URL
		if (formNameIsNull && formDateIsNull) {
			let updatedFormArr = await Forms.getFormNames([form], baseArchiveUrl);
			let updatedForm = updatedFormArr[0];
			Forms.updateFormFileName(updatedForm.id, updatedForm.form_file_name);
			if (updatedForm.form_file_name === null) {
				let url = `${baseArchiveUrl}${form.form_file_path}`
				return res.redirect(url)
			}
		}
		// If the form file has been searched but wasn't found
		// Then redirect to the parent folder URL
		if (formNameIsNull && !formDateIsNull) {
			let url = `${baseArchiveUrl}${form.form_file_path}`
			return res.redirect(url)
		}
		// If the form has been found
		// Then redirect to the form URL
		let url = `${baseXbrlUrl}${form.form_file_path}${form.form_file_name}`
		return res.redirect(301, url);
	} catch (err) {
		next(err)
	}
});

module.exports = router;
