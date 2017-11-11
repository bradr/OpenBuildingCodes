var express = require('express');
var hbs = require('express-handlebars');
var bodyParser = require('body-parser');
//var search = require('./lib/search.js');
var db = require('./lib/db.js');
var ocr = require('./lib/ocr.js');

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

// Admin Page
app.get('/admin', function (req, res, next) {
  db.documentList(function (err, document) {
    if (err) {
      res.render('admin');
    } else {
      var documents = JSON.parse(' {"document": [' + document + '] }');
      res.render('admin', documents);
    }
  });
});

//Post document data
app.put('/admin/document', function (req, res, next) {
  //Data to store
  var json = {
    'id' : req.body.id,
    'title' : req.body.title,
    'htmlurl' : req.body.htmlurl,
    'pdfurl' : req.body.pdfurl
  };

  //Post to database
  db.addDocument(JSON.stringify(json), function (err, result) {

    if (err) {
      res.status(400).send(err);
    } else {
      res.status(200).send(result);
    }
  });

});
//Post document data
app.delete('/admin/document/:id', function (req, res, next) {
  //Delete from database
  db.deleteDocument(req.params.id, function (err, result) {
    //Delete .json file
   fs.unlink('files/' + req.params.id + '.json', function (err, result) {
     res.status(200).send('Successfully deleted'+req.params.id);
   });
  });
});

app.get('/admin/importCSV', function (req, res, next) {
  //Import Data from CSV file
  var Converter = require('csvtojson').Converter;
  var csvtojson = new Converter({});
  csvtojson.fromFile('./files/database.csv', function (error, data) {
    db.wipe(function (err, result) {
      var counter = 0;
      for (var i in data) {
        db.addDocument(JSON.stringify(data[i]),function (error, result) {
          counter++;
          if (i == data.length-1 && counter == data.length-1) {
            res.send("Success");
          }
        });
      }
    });
  });
});
app.get('/admin/exportCSV', function (req, res, next) {
  //Export Data from CSV file
  var json2csv = require('json2csv');
  db.documentList(function (err, json) {
    var csv;
    json = '{"data": [' + json + ']}';
    json2csv(JSON.parse(json), function (err, csv) {
      if (err) {
        //res.status(500).send(err)

      } else {
        fs.writeFile('files/database.csv', csv, function (err, result) {
          if (err) {
            //res.status(500).send(err);
            console.log(err);
          } else {
            res.status(200).send(result);
          }
        });
      }
    });
  });
});
app.get('/admin/download/:id', function (req, res, next) {
  var id = req.params.id;
  db.getParam(id, 'htmlurl', function (err, htmlurl) {
    db.getParam(id, 'pdfurl', function (err, pdfurl) {
      //var pdfurl = req.body.pdfurl;
      var cp = require("child_process");
      res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-control": "no-cache"});

      if (htmlurl) {
        if (htmlurl.match(/iccsafe\.org/)) {
          var links = [];
          var urlRoot = htmlurl.match(/^(.+)index\.html$/)[1];
          function getLinks(html, callback) {
            var cheerio = require('cheerio');
            $ = cheerio.load(html);
            var toc = $('#button_toc').html();
            $ = cheerio.load(toc);
            $('a').map(function(i, link) {
              links.push(urlRoot+link.attribs.href)
            });
            fs.writeFileSync('files/'+id+'.html', toc);
            callback(links);
          }
          var i = 0;
          function downloadLinks(links) {
            //var cmd = 'curl -g -o files/'+id+'_'+i+'.html "'+ links[i]+'"';
            if (links[i].match(/html$/)) {
              var request2 = require('request');
              request2(links[i], function(error, response, html) {
                var cheerio = require('cheerio');
                $ = cheerio.load(html);
                //console.log(html);
                var contents = $('.print-section').html();
                fs.writeFileSync('files/'+id+'_'+i+'.html', contents);
                i++;
                if (i < links.length) {
                  console.log('Downloading' + links[i]);
                  res.write('data: HTML '+links[i]+'\n\n');
                  downloadLinks(links);
                }
              });
            } else {
              i++;
              if (i < links.length) {
                downloadLinks(links);
              }
            }

            //console.log(cmd);
            // var process = cp.exec(cmd, function(error, stdout, stderr) {
            //   i++;
            //   if (i < links.length) {
            //     console.log(stdout+stderr);
            //     res.write('data: HTML '+links[i]+'\n\n');
            //     //downloadContents()
            //     downloadLinks(links);
            //   }
            // });
          }
          var request = require('request');
          request(htmlurl, function(error, response, html) {
            getLinks(html, function (links) {
              downloadLinks(links);
            });
          });
        }

      }

      if (pdfurl) {
        var process = cp.spawn('curl', ["-o", "files/"+id+".pdf", "-L", pdfurl]);
        var str = "";

        process.stderr.on('data', function (data) {
          str += data.toString();
          var lines = str.split(/(\r?\n)/g);
          for (var i in lines) {
            if (i == lines.length -1) {
              str = lines[i];
            } else {
              res.write('data: PDF' + lines[i] + "\n\n");
            }
          }
        });
        process.on('close', function (code) {
          res.write('data: --EOF--\n\n');
        });
        process.on('error', function (err) {
          console.log('ERROR: '+err);
        });
      } else {
        res.write("data: PDF--none--\n\n");
      }
    });
  });
});

app.get('/admin/ocr/:id', function (req, res, next) {
  var id = req.params.id;
  res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-control": "no-cache"});
  res.write('data: Initializing OCR function\n\n');
  db.getParam(id, 'htmlurl', function (err, htmlurl) {
    db.getParam(id, 'pdfurl', function (err, pdfurl) {
      ocr.getNumberOfPages(id)
      .then(function(num) {
        res.write('data: ' + id + ': OCRing ' + num + ' Pages'+'\n\n');
        function loop(page) {
          ocr.ocr(id,page)
          .then(function(page) {
            if (page < num) {
              res.write('data: ' + id + ': OCR Page ' + page + ' of ' + num + '\n\n');
              loop(page);
            } else {
              res.write('data: ' + id + ': OCR Complete: '+ page +' pages scanned\n\n');
              res.write('data: --COMPLETE--\n\n');
            }
          });
        }
        loop(1);
      })
      .catch(function(err) {
        console.log("ERROR "+err);
      });
    });
  });
});

app.get('/admin/createJSON/:id', function (req, res, next) {
  var id = req.params.id;
  db.readDocument(id, function (err, doc) {
    fs.writeFile('files/' +id+'.json', doc, function (err, result) {
      if (!err) {
        res.status(200).send("Success");
      } else {
        res.status(500).send("Error");
      }
    });
  });
});

app.get('/admin/getStatus/:id', function (req, res, next) {
  var id = req.params.id;

    var html = new Promise (function(resolve, reject) {
      db.getParam(id, 'htmlurl', function(err, result) {
        if (err) {
          reject(err);
        }
        if (result) {
          fs.stat("files/"+ id + ".html", function (err, stats) {
            if (err || !stats.isFile()) {
              resolve(id + " HTML File: Not Downloaded");
            } else {
              resolve(" HTML File: Downloaded!");
            }
          });
        } else {
          resolve(id + " HTML File: None");
        }
      });
    });

    var pdfFile = new Promise (function(resolve, reject) {
      db.getParam(id, 'pdfurl', function(err, result) {
        if (err) {
          reject(err);
        }
        if (result) {
          fs.stat("files/"+id + ".pdf", function (err, result) {
            if (err) {
              resolve(err);
            }
            if (!result.isFile()) {
              resolve(id + " PDF File: Not Downloaded");
            } else {
              resolve(id + " PDF File: Downloaded");
            }
          });
        } else {
          resolve(id + " PDF File: none");
        }
      });
    });

    var pdfSplit = new Promise (function(resolve, reject) {
      ocr.getNumberOfPages(id)
      .then(function(pages) {
        fs.stat("files/" +id+ "_" + (pages-1) + ".tif", function(err, result) {
          if (err) {
            resolve(id + " Pages not split");
          }
          if (result) {
            resolve(id + " Pages Split");
          } else {
            resolve(id + " Pages not split");
          }
        });        
      });
    });

    var pdfOCR = new Promise (function(resolve, reject) {
      ocr.getNumberOfPages(id)
      .then(function(pages) {
        fs.stat("files/"+id+"_" + (pages-1) + ".txt", function(err, result) {
          if (err) {
            resolve(id + " Pages not OCRed");
          }
          if (result) {
            resolve(id + " Pages OCRed");
          } else {
            resolve(id + " Pages not OCRed");
          }
        });        
      });
    });

  Promise.all([html, pdfFile, pdfSplit, pdfOCR])
  .then(results => {
    var result ="";
    for (var r of results) {
      result += r + "<br>";
    }
    res.status(200).send(result);
  })
  .catch(error => {
    console.log(error);
    res.status(500).send(error);
  });

});

app.listen(PORT);
console.log('Running on localhost:' + PORT);
