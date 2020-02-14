# EDGAR-search
The SEC EDGAR search engine for public company financial statements lets you rapidly find and see the HTML version of a public company's financial statements filed with the SEC. This repo is for the back-end of the service. To build and run the front-end, please see the front-end repo here: https://github.com/kierankay/EDGAR-search-frontend

Requirements:
- Postgres
- NPM

To install the package:
1. Create a new postgres database named 'edgar_search'
2. Import the data.sql file into the edgar_search database (CLI: pg edgar_search < data.sql)
3. Install the NPM package (CLI: npm install)

To build the search engine dataset:
1. Run the npm package (npm start)
2. Build the ticker data table (visit: localhost:3000/api/forms/build/tickers)
3. Build the form data table (visit: localhost:3000/api/forms/build/tickers)

Search API endpoints:
1. See a list of all forms from a company by its ticker: (visit: localhost:3000/api/forms/ticker/<ticker>)
2. See a specific form by its database record ID: (visit: localhost:3000/api/forms/<id>)
  
Download and run the front-end repo for a more elegant interface to the EDGAR search engine here: https://github.com/kierankay/EDGAR-search-frontend
