var express = require('express');
var hbs = require('express-handlebars');
var bodyParser = require('body-parser');
var search = require('./lib/search.js');
var db = require('./lib/db.js');

var fs = require('fs');

var PORT = 8080;

var app = express();

app.engine('hbs', hbs({extname: 'hbs', defaultLayout: 'main'}));
app.set('view engine', 'hbs');

app.use(bodyParser.json({ type: 'application/*+json' }));
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

// a middleware with no mount path; gets executed for every request to the app
app.use(function (req, res, next) {
  console.log('Time:', Date.now());
  next();
});
app.use('/static',express.static('static'));

// Main Search Page
app.get('/', function (req, res, next) {
  res.render('index', { title:'Search', message:'Search Now:'} );
  console.log('Index');
});

// Search
app.get('/search', function (req, res, next) {
  search.search(req.query.query, function (err, results) {
    res.render('search', { query: req.query.query, results: results });
  });
});
app.get('/api/search', function (req, res, next) {
  res.setHeader('Content-Type', 'application/json');
  search.search(req.query.query, function (err, results) {
    res.json({'results': results});
  });
});

//Get Document list
app.get('/api/documents', function (req, res, next) {
  //Read document list from database
  db.documentList(function (document) {
    res.json(document);
  });
});
//Get document data
app.get('/api/document:id', function (req, res, next) {
  //Read document data from db
  db.readDocument(req.params.id, function (err, result) {
    res.json(result);
  });
});

app.get('/api/locations', function (req, res, next) {
  //Get list of locations
});
app.get('/api/location/:name', function (req, res, next) {
  //Get list of codes corresponding to above location
});


app.listen(PORT);
console.log('Running on localhost:' + PORT);
