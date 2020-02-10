\c databook 

DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS filings CASCADE;

CREATE TABLE companies (
  cik INTEGER PRIMARY KEY,
  ticker TEXT UNIQUE NOT NULL
);

CREATE TABLE filings (
  id SERIAL PRIMARY KEY,
  cik INTEGER NOT NULL REFERENCES companies,
  form_type TEXT NOT NULL,
  date_filed DATE NOT NULL,
  file_location TEXT NOT NULL UNIQUE
);