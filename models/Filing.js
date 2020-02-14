const db = require('../db');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const timeout = require('../helpers/timeout')

let baseTimeoutMs = 1000;

class Forms {

    // 
    // EDGAR & FILE SYSTEM METHODS
    //

    // Accept a string for the base URL of the EDGAR archive
    // Return an array of URLs for all historical quarterly lists of xbrl forms
    static async buildFormListURLs(baseArchiveUrl) {
        let currYear = new Date().getFullYear();
        let urls = [];

        for (let y = 1993; y < currYear; y++) {
            for (let q = 1; q <= 4; q++) {
                urls.push(`${baseArchiveUrl}${y}/QTR${q}/xbrl.idx`);
            }
        }

        let currQtr = Math.ceil(new Date().getMonth() / 4)
        for (let q = 1; q <= currQtr; q++) {
            urls.push(`${baseArchiveUrl}${currYear}/QTR${q}/xbrl.idx`);
        }

        return urls;
    }

    // Accept a string for the base URL of the EDGAR archive
    // Return the current quarterly xbrl filing link
    static async getFormListUrl(baseUrl) {
        let currQtr = Math.ceil(new Date().getMonth() / 4)
        let currYear = new Date().getFullYear();
        let formListUrl = `${baseUrl}${currYear}/QTR${currQtr}/xbrl.idx`
        return formListUrl;
    }

    // Accept an array of URLs for all historical quarterly lists of xbrl forms
    // and save those files to the file path
    static async getFormLists(formListUrls, baseXbrlListSavePath) {
        async function checkNextDir(formListUrls) {
            let formUrl = formListUrls.pop();
            let formDataObj = await axios.get(formUrl);
            let formData = formDataObj.data

            if (!fs.existsSync(baseXbrlListSavePath)) {
                fs.mkdirSync(baseXbrlListSavePath, { recursive: false });
            }

            fs.writeFileSync(`${baseXbrlListSavePath}/${formUrl.split('/')[6] + '-' + formUrl.split('/')[7] + '-' + filingURL.split('/')[8]}`, formData);
            await timeout(baseTimeoutMs);

            if (formListUrls.length > 0) {
                await checkNextDir(formListUrls)
            }
        }

        await checkNextDir(filingURLs);
    }

    // Accept the file name and path for an index of xbrl forms
    // Return an array of objects containing each form's filing data
    static async loadFormList(formList, baseXbrlListSavePath) {
        let companyForms = fs.readFileSync(`${baseXbrlListSavePath}/${formList}`, 'utf8').toString().split(/\n/).map(e => ({
            'cik': parseInt(e.split('|')[0]),
            'companyName': e.split('|')[1],
            'fileType': e.split('|')[2],
            'date': e.split('|')[3],
            'fileUrl': e.split('|')[4] ? e.split('|')[4].split(/[/|\-|.]/).reduce((r, e, i) => (i === 2 || i === 5) ? r + e + '/' : (i === 3 || i === 4) ? r + e : r + '', '/') : 0
        }));
        return companyForms;
    }

    // Accept an array of form data with missing form file names
    // Return a new array of form data with form file names added where found, otherwise null
    static async getFormNames(formsArray, baseArchiveUrl) {
        let unNamedForms = formsArray.slice();
        let namedForms = await this.getNextFormName(unNamedForms, baseArchiveUrl);
        return namedForms;

        async function getNextFormName(unNamedForms, baseArchiveUrl, namedForms = []) {
            let formData = unNamedForms.pop();
            let formType = formData.form_type.split(/[-/]/).join('');
            let formPath = formData.form_file_path;
            let formName = formData.form_file_name;

            // If a form's file name is null
            // then fetch it from the server and add it (if found) or null to the form
            if (formName === null || formName === '{}') {
                let folderStructure = await Forms.getFormFileDirectory(baseArchiveUrl, formPath);
                let formFileName = await Forms.findForm(folderStructure, formPath, formType);
                formData.form_file_name = formFileName;
                if (unNamedForms.length > 0) {
                    await timeout(baseTimeoutMs);
                }
            }

            namedForms.push(formData);

            if (unNamedForms.length > 0) {
                let response = await Forms.getNextFormName(unNamedForms, baseArchiveUrl, namedForms);
                return response;
            } else {
                return namedForms;
            }
        }
    }

    // Accept an array of form data with missing form file names
    // Return a new array of form data with form file names added where found, otherwise null
    static async getNextFormName(unNamedForms, baseArchiveUrl, namedForms = []) {
        let formData = unNamedForms.pop();
        let formType = formData.form_type.split(/[-/]/).join('');
        let formPath = formData.form_file_path;
        let formName = formData.form_file_name;

        // If a form's file name is null
        // then fetch it from the server and add it (if found) or null to the form
        if (formName === null || formName === '{}') {
            let folderStructure = await Forms.getFormFileDirectory(baseArchiveUrl, formPath);
            let formFileName = await Forms.findForm(folderStructure, formPath, formType);
            formData.form_file_name = formFileName;
            if (unNamedForms.length > 0) {
                await timeout(baseTimeoutMs);
            }
        }

        namedForms.push(formData);

        if (unNamedForms.length > 0) {
            let response = await this.getNextFormName(unNamedForms, baseArchiveUrl, namedForms);
            return response;
        } else {
            return namedForms;
        }
    }

    // Accept an array of form data that doesn't include form file names
    // Synchronously lookup the form's file name in EDGAR, and then update it to the database
    static async getAndUpdateFormFileNames(forms, baseUrl) {
        let namedForms = await Forms.getFormNames(forms, baseUrl);
        for (let form of namedForms) {
            await Forms.updateFormFileName(form.id, form.form_file_name)
        }
    }

    // Accept EDGAR Archive's base URL, and the parent directory of a form
    // Return the path to the form file's parent directory in EDGAR
    static async getFormFileDirectory(baseArchiveUrl, formPath) {
        let result = await axios.get(`${baseArchiveUrl}${formPath}index.json`);
        return result.data
    }

    // Find the form's file name from the directory structure
    static async findForm(folderStructure, formType) {
        let forms = folderStructure.directory.item;
        let url = forms.filter(function (e) {
            let lowerFormType = formType.toLowerCase();
            let ext = e.name.split('.');
            let extMatch = ext[ext.length - 1]

            let name = e.name.split('-').join('');
            let nameMatch = name.search(`${lowerFormType.split('-').join('')}`);
            if (extMatch === 'htm' && nameMatch !== -1) {
                return true;
            }
        })
        return url[0] ? url[0].name : null;
    }

    // 
    // DATABASE INTERACTION METHODS
    //

    static async addOne(file) {
        try {
            let { cik, formType, date, formPath } = file
            if (!isNaN(cik)) {
                let result = await db.query(`
                INSERT INTO forms
                (cik, form_type, date_filed, form_file_path)
                VALUES ($1, $2, $3, $4)`, [cik, formType, date, formPath]
                );
            }
        } catch (err) {
            console.log(err.detail);
        }
    }

    static async getByCik(cik) {
        let result = await db.query(`
        SELECT *
        FROM forms
        WHERE cik = $1
        `, [cik]);
        return result.rows;
    }

    static async getById(id) {
        let result = await db.query(`
        SELECT *
        FROM forms
        WHERE id = $1
        `, [id]);
        return result.rows[0];
    }

    static async updateFormFileName(id, fileUrl) {
        try {
            let result = await db.query(`
        UPDATE forms
        SET form_file_name = $2, date_last_searched = $3
        WHERE id = $1
        `, [id, fileUrl, new Date()]);
            return { "message": "success" }
        } catch (err) {
            console.log(err.detail);
        }
    }

    //
    // BACKUP METHODS
    //

    // Backup function to load filings directly from SEC website
    // Used in case our library is missing something. We should log the use of this function.
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

module.exports = Forms;