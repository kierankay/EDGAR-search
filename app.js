const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const app = express();

const companyRoutes = require('./routes/companyRoutes');
app.use('/api/companies', companyRoutes);

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