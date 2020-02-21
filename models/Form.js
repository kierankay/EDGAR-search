const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const db = require('../db');
const timeout = require('../helpers/timeout');

const { baseTimeoutMs } = require('../constants');

class Forms {
  //
  // EDGAR & FILE SYSTEM METHODS
  //

  // Accept a string for the base URL of the EDGAR archive
  // Return an array of URLs for all historical quarterly lists of xbrl forms
  static buildFormListUrls(baseIdxArchiveUrl) {
    const currYear = new Date().getFullYear();
    const urls = [];

    for (let y = 1993; y < currYear; y += 1) {
      for (let q = 1; q <= 4; q += 1) {
        urls.push(`${baseIdxArchiveUrl}/${y}/QTR${q}/xbrl.idx`);
      }
    }

    const currQtr = Math.ceil(new Date().getMonth() / 4);
    for (let q = 1; q <= currQtr; q += 1) {
      urls.push(`${baseIdxArchiveUrl}/${currYear}/QTR${q}/xbrl.idx`);
    }

    return urls;
  }

  // Accept a string for the base URL of the EDGAR archive
  // Return the current quarterly xbrl filing link
  static async getCurrFormListUrl(baseIdxArchiveUrl) {
    const currQtr = Math.ceil(new Date().getMonth() / 4);
    const currYear = new Date().getFullYear();
    const formListUrl = `${baseIdxArchiveUrl}/${currYear}/QTR${currQtr}/xbrl.idx`;
    return formListUrl;
  }

  // Accept an array of URLs for lists of xbrl forms, and save file path
  // and save those files to the file path
  static async getFormLists(formListUrls, baseXbrlListSavePath) {
    const checkNextDir = async (formListUrls) => {
      const formUrl = formListUrls.pop();
      const formDataObj = await axios.get(formUrl);
      const formData = formDataObj.data;

      if (!fs.existsSync(baseXbrlListSavePath)) {
        fs.mkdirSync(baseXbrlListSavePath, { recursive: false });
      }

      await fs.writeFile(`${baseXbrlListSavePath}/${formUrl.split('/')[6]} + '-' + ${formUrl.split('/')[7]} + '-' + ${formUrl.split('/')[8]}`, formData);
      await timeout(baseTimeoutMs);

      if (formListUrls.length > 0) {
        await checkNextDir(formListUrls);
      }
    };

    await checkNextDir(formListUrls);
  }

  // Accept the file name and path for an index of xbrl forms
  // Return an array of objects containing each form's filing data

  static async loadFormList(formListFileName, baseXbrlListSavePath) {
    const companyForms = fs.readFileSync(`${baseXbrlListSavePath}/${formListFileName}`, 'utf8')
      .toString()
      .split(/\n/)
      .map((e) => ({
        cik: parseInt(e.split('|')[0], 10),
        companyName: e.split('|')[1],
        formType: e.split('|')[2],
        date: e.split('|')[3],
        formPath: e.split('|')[4]
          ? e.split('|')[4].split(/[/|\-|.]/).reduce((r, el, i) => {
            if (i === 2 || i === 5) {
              return `${r + el} + /`;
            }
            if (i === 3 || i === 4) {
              return r + el;
            }
            return `${r} + /`;
          })
          : 0,
      }));
    return companyForms;
  }

  // Accept an array of form data with missing form file names
  // Return a new array of form data with form file names added where found, otherwise null
  static async getFormNames(formsArray, baseArchiveUrl) {
    const unNamedForms = formsArray.slice();

    const getNextFormName = async (unNamedForms, baseArchiveUrl, namedForms = []) => {
      const formData = unNamedForms.pop();
      const formType = formData.form_type.split(/[-/]/).join('');
      const formPath = formData.form_file_path;
      const formName = formData.form_file_name;

      // If a form's file name is null
      // then fetch it from the server and add it (if found) or null to the form
      if (formName === null || formName === '{}') {
        const folderStructure = await Forms.getFormFileDirectory(baseArchiveUrl, formPath);
        const formFileName = await Forms.findForm(folderStructure, formType);
        formData.form_file_name = formFileName;
        if (unNamedForms.length > 0) {
          await timeout(baseTimeoutMs);
        }
      }

      namedForms.push(formData);

      if (unNamedForms.length > 0) {
        const response = await getNextFormName(unNamedForms, baseArchiveUrl, namedForms);
        return response;
      }
      return namedForms;
    };

    const namedForms = await getNextFormName(unNamedForms, baseArchiveUrl);
    return namedForms;
  }

  // Accept an array of form data that doesn't include form file names
  // Synchronously lookup the form's file name in EDGAR, and then update it to the database
  static async getAndUpdateFormFileNames(forms, baseUrl) {
    const namedForms = await Forms.getFormNames(forms, baseUrl);
    namedForms.forEach(async (form) => Forms.updateFormFileName(form.id, form.form_file_name));
  }


  // Accept EDGAR Archive's base URL, and the parent directory of a form
  // Return the path to the form file's parent directory in EDGAR
  static async getFormFileDirectory(baseArchiveUrl, formPath) {
    const result = await axios.get(`${baseArchiveUrl}${formPath}index.json`);
    return result.data;
  }

  // Find the form's file name from the directory structure
  static async findForm(folderStructure, formType) {
    const forms = folderStructure.directory.item;
    const url = forms.filter((e) => {
      const lowerFormType = formType.toLowerCase();
      const ext = e.name.split('.');
      const extMatch = ext[ext.length - 1];

      const name = e.name.split('-').join('');
      const nameMatch = name.search(`${lowerFormType.split('-').join('')}`);
      if (extMatch === 'htm' && nameMatch !== -1) {
        return true;
      }
      return false;
    });
    return url[0] ? url[0].name : null;
  }

  //
  // DATABASE INTERACTION METHODS
  //

  static async addOne(form) {
    try {
      const {
        cik, formType, date, formPath,
      } = form;
      if (!Number.isNaN(cik)) {
        const result = await db.query(`
        INSERT INTO forms
        (cik, form_type, date_filed, form_file_path)
        VALUES ($1, $2, $3, $4)
        RETURNING cik`, [cik, formType, date, formPath]);
        return result.rows[0];
      }
      return [];
    } catch (err) {
      throw new Error(err.detail);
    }
  }

  static async getByCik(cik) {
    try {
      const result = await db.query(`
      SELECT *
      FROM forms
      WHERE cik = $1
      `, [cik]);
      return result.rows;
    } catch (err) {
      throw new Error(err.detail);
    }
  }

  static async getById(id) {
    try {
      const result = await db.query(`
      SELECT *
      FROM forms
      WHERE id = $1
      `, [id]);
      return result.rows[0];
    } catch (err) {
      throw new Error(err.detail);
    }
  }

  static async updateFormFileName(id, fileUrl) {
    try {
      const result = await db.query(`
      UPDATE forms
      SET form_file_name = $2, date_last_searched = $3
      WHERE id = $1
      RETURNING id
      `, [id, fileUrl, new Date()]);
      return { message: `success inserting ${result}` };
    } catch (err) {
      throw new Error(err.detail);
    }
  }

  //
  // BACKUP METHODS
  //

  // Backup function to load filings directly from SEC website
  // Used in case our library is missing something. We should log the use of this function.
  static async loadByTicker(ticker) {
    const searchResult = await axios.get(`https://www.sec.gov/cgi-bin/browse-edgar?CIK=${ticker}&Find=Search&owner=exclude&action=getcompany`);
    const searchHtmlBody = searchResult.data;
    const $s = cheerio.load(searchHtmlBody);
    const filingTable = $s('.tableFile2').children().children();
    const filings = filingTable.map((i, e) => {
      const filingData = $s(e).children();
      const linkData = filingData.nextAll();
      const descriptionData = linkData.nextAll();
      const filingDateData = descriptionData.nextAll();
      const fileFilmData = filingDateData.nextAll();

      return {
        filing: filingData.html().trim(),
        link: decodeURI(linkData.html().trim().split(/"/)[1]),
        description: descriptionData.text().trim().split(/\s{2,}/)[0],
        filing_date: filingDateData.html().trim(),
        file_film_link: decodeURI(fileFilmData.html().trim().split(/"/)[1]),
        file_film_number: fileFilmData.text().trim(),
      };
    }).get();
    return filings;
  }
}

module.exports = Forms;
