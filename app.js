const ExpressError = require('./helpers/expressError');


const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const app = express();

const cors = require('cors');
app.use(cors());
app.options('*', cors());

const formRoutes = require('./routes/formRoutes');
app.use('/api/forms', formRoutes);

app.use(function (req, res, next) {
    const err = new ExpressError('resource not found', 404);
    return next(err);
  })
  
  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    if (process.env.NODE_ENV != "test") {
      console.error(err.stack);
    }
  
    return res.json({
      error: err,
      message: err.message
    });
  });

module.exports = app;