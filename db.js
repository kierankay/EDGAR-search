const { Client } = require('pg');
const { DB_URI, PGUSER, PGPASSWORD } = require('./config');

const db = new Client({ database: DB_URI, user: PGUSER, password: PGPASSWORD });

db.connect();

module.exports = db;