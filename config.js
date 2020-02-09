const dotenv = require('dotenv');
dotenv.config();

let {
  BACKENDSERVER,
  FRONTENDSERVER,
  PGUSER,
  PGPASSWORD
} = process.env

if (process.env.NODE_ENV === "test") {
  DB_URI = `databook-test`
} else {
  DB_URI = process.env.DATABASE_URL || `databook`;
}

module.exports = { DB_URI, PGUSER, PGPASSWORD, BACKENDSERVER, FRONTENDSERVER }