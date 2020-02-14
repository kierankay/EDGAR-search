\c edgar-search 

DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS forms CASCADE;

CREATE TABLE companies (
  cik INTEGER PRIMARY KEY,
  ticker TEXT UNIQUE NOT NULL
);

CREATE TABLE forms (
  id SERIAL PRIMARY KEY,
  cik INTEGER NOT NULL REFERENCES companies,
  form_type TEXT NOT NULL,
  date_filed DATE NOT NULL,
  form_file_path TEXT NOT NULL UNIQUE,
  form_file_name TEXT,
  date_last_searched DATE
);