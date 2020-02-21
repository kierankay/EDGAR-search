const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const ExpressError = require('./helpers/expressError');
const formRoutes = require('./routes/formRoutes');
const { tickerJob, xbrlJob } = require('./cron-jobs/dailyCron');

dotenv.config();

const app = express();
app.use(cors());
app.options('*', cors());
app.use('/api/forms', formRoutes);

app.use((req, res, next) => {
  const err = new ExpressError('resource not found', 404);
  return next(err);
});

app.use((err, req, res) => {
  res.status(err.status || 500);
  if (process.env.NODE_ENV !== 'test') {
    console.error(err.stack);
  }

  return res.json({
    error: err,
    message: err.message,
  });
});

tickerJob.start();
xbrlJob.start();


module.exports = app;
