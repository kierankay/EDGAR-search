\c databook 

DROP TABLE IF EXISTS cohorts CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS pairs CASCADE;
DROP TABLE IF EXISTS password_tokens CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

CREATE TABLE organizations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE cohorts (
  id SERIAL PRIMARY KEY,
  cohort_name TEXT,
  organization_id INTEGER NOT NULL REFERENCES organizations
);

CREATE TABLE students (
  id SERIAL PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  cohort_id INTEGER NOT NULL REFERENCES cohorts
);

CREATE TABLE groups (
  id SERIAL PRIMARY KEY,
  project TEXT,
  date DATE DEFAULT NOW(),
  cohort_id INTEGER NOT NULL REFERENCES cohorts
);

CREATE TABLE pairs (
  student1_id INTEGER NOT NULL REFERENCES students,
  student2_id INTEGER REFERENCES students,
  group_id INTEGER NOT NULL REFERENCES groups,
  PRIMARY KEY (student1_id, group_id)
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  organization_id INTEGER NOT NULL REFERENCES organizations,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL
);

CREATE TABLE password_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users,
  hashed_token TEXT UNIQUE NOT NULL,
  valid BOOLEAN NOT NULL DEFAULT TRUE,
  date DATE DEFAULT NOW()
);