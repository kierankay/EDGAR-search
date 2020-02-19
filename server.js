let app = require('./app');
const dotenv = require('dotenv');
dotenv.config();

const { BACKENDPORT } = process.env;

app.listen(BACKENDPORT, function () {
    console.log(`Listening on ${BACKENDPORT}`);
})