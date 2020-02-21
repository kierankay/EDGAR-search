const axios = require('axios');
const fs = require('fs');
const db = require('../db');

class Companies {
  static async load(loadFrom, saveTo) {
    const result = await axios.get(loadFrom);
    const resultData = result.data;
    if (!fs.existsSync(`${saveTo}`)) {
      fs.mkdirSync(`${saveTo}`, { recursive: false });
    }
    fs.writeFileSync(`${saveTo}/tickers.txt`, resultData);
  }

  static async loadFromFile(filePath) {
    const companies = fs.readFileSync(`${filePath}/tickers.txt`, 'utf8')
      .toString()
      .split(/\n/)
      .map((e) => ({
        cik: parseInt(e.split(/\s+/)[1], 10),
        ticker: e.split(/\s+/)[0],
      }));
    return companies;
  }

  static async add(companies) {
    companies.forEach((e) => (Companies.addOne(e)));
  }

  //
  // DATABASE METHODS
  //

  static async getCik(ticker) {
    try {
      const result = await db.query(`
      SELECT *
      FROM companies
      WHERE ticker = $1`,
      [ticker]);
      const { cik } = result.rows[0];
      return cik;
    } catch (err) {
      throw new Error(err.detail);
    }
  }

  static async addOne(company) {
    try {
      const { cik, ticker } = company;
      const result = await db.query(`
      INSERT INTO companies
      (cik, ticker)
      VALUES ($1, $2)
      RETURNING ticker`, [cik, ticker]);
      return { message: `${result} successfully added` };
    } catch (err) {
      throw new Error(err.detail);
    }
  }
}

module.exports = Companies;
