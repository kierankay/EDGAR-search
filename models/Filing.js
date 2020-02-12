const db = require('../db');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const timeout = require('../helpers/timeout')

class Forms {

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

    // Return an array of URLs pointing to quarterly lists of xbrl filing links
    static async buildFormListURLs(baseUrl) {
        let currYear = new Date().getFullYear();
        let urls = [];

        for (let y = 1993; y < currYear; y++) {
            for (let q = 1; q <= 4; q++) {
                urls.push(`${baseUrl}${y}/QTR${q}/xbrl.idx`);
            }
        }

        let currQtr = Math.ceil(new Date().getMonth() / 4)
        for (let q = 1; q <= currQtr; q++) {
            urls.push(`${baseUrl}${currYear}/QTR${q}/xbrl.idx`);
        }

        return urls;
    }

    // Fetch all lists of xbrl forms filed from 1993 to present
    // and save them to disk
    static async getFormLists(formListUrls) {
        async function checkNextDir(formListUrls) {
            let formUrl = formListUrls.pop();
            let formDataObj = await axios.get(formUrl);
            let formData = formDataObj.data

            if (!fs.existsSync(`./data/xbrls`)) {
                fs.mkdirSync(`./data/xbrls`, { recursive: false });
            }

            fs.writeFileSync(`./data/xbrls/${formUrl.split('/')[6] + '-' + formUrl.split('/')[7] + '-' + filingURL.split('/')[8]}`, formData);
            await timeout(3000);

            if (formListUrls.length > 0) {
                await checkNextDir(formListUrls)
            }
        }

        await checkNextDir(filingURLs)
    }

    // Load one xbrl form list from the drive
    static async loadFormList(filePath) {
        let companyForms = fs.readFileSync(filePath, 'utf8').toString().split(/\n/).map(e => ({
            'cik': parseInt(e.split('|')[0]),
            'companyName': e.split('|')[1],
            'fileType': e.split('|')[2],
            'date': e.split('|')[3],
            'fileUrl': e.split('|')[4] ? e.split('|')[4].split(/[/|\-|.]/).reduce((r, e, i) => (i === 2 || i === 5) ? r + e + '/' : (i === 3 || i === 4) ? r + e : r + '', '/') : 0
        }));
        return companyForms;
    }

    static async add(file) {
        file.forEach((e) => (this.addOne(e)));
    }

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

    // Update an array of company form data
    // with the the form name
    static async getFormNames(formsArray, baseArchiveUrl) {
        let unNamedForms = formsArray.slice();
        let namedForms = await this.getNextForm(unNamedForms, baseArchiveUrl);
        return namedForms;
    }

    static async getNextForm(unNamedForms, baseArchiveUrl, namedForms = []) {
        let formData = unNamedForms.pop();
        let formType = formData.form_type.split(/[-/]/).join('');
        let formPath = formData.form_file_path;
        let formName = formData.form_file_name;

        // If a form's filename is null
        // then fetch it from the server and return it
        if (formName === null || formName === '{}') {
            let folderStructure = await Forms.getFileDirectory(baseArchiveUrl, formPath);
            let formFileName = await Forms.findForm(folderStructure, formPath, formType);

            formData.form_file_name = formFileName;
            await timeout(1000);
        }

        namedForms.push(formData);

        if (unNamedForms.length > 0) {
            let response = await this.getNextForm(unNamedForms, baseArchiveUrl, namedForms);
            return response;
        } else {
            return namedForms;
        }
    }

    static async updateFormFileNames(namedForms) {
        for (let form of namedForms) {
            await Forms.updateFormFileName(form.id, form.form_file_name)
        }
    }

    static async getAndUpdateFormFileNames(forms, baseUrl) {
        let namedForms = await Forms.getFormNames(forms, baseUrl);
        Forms.updateFormFileNames(namedForms);
    }

    static async getFileDirectory(baseArchiveUrl, formPath) {
        let result = await axios.get(`${baseArchiveUrl}${formPath}index.json`);
        return result.data
    }

    static async findForm(folderStructure, baseArchiveUrl, formType) {
        let forms = folderStructure.directory.item;
        let url = forms.filter(function (e) {
            let lowerFormType = formType.toLowerCase();
            let ext = e.name.split('.');
            let extMatch = ext[ext.length - 1]

            let name = e.name.split('-').join('');
            let nameMatch = name.search(`${lowerFormType.split('-').join('')}`);
            if (extMatch === 'htm' && nameMatch !== -1) {
                return `https://www.sec.gov/ix?doc=/Archives/edgar/data${baseArchiveUrl}${e.name}`
            }
        })
        return url[0] ? url[0].name : null;
    }
}

module.exports = Forms;