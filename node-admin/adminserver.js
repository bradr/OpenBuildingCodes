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
            res.status(200).send("Success");
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


      }
      if (pdfurl) {
        var process = cp.spawn('curl', ["-o", "files/"+id+".pdf", pdfurl]);
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
  res.write('data: Initializing OCR function\n\n')
  db.getParam(id, 'htmlurl', function (err, htmlurl) {
    db.getParam(id, 'pdfurl', function (err, pdfurl) {
      var cp = require("child_process");

      cp.exec('pdftk files/icc.ibc.2012.pdf dump_data | grep NumberOfPages', function (error, stdout, stderr) {
        console.log('stdout:'+stdout+' stderr:'+stderr);
        var num = stdout.match(/\d+/);
        num = 10;
        console.log('num:'+num);
        var i = 1;
        function ocr(i) {
          if (i<num) {
            cp.exec('pdftk files/icc.ibc.2012.pdf cat '+i+' output files/icc.ibc.2012_'+i+'.pdf', function (error, stdout, sderr) {
              console.log('PDFTD: stdout:'+stdout+' stderr:'+stderr);
              cp.exec('pdffonts files/icc.ibc.2012_'+i+'.pdf', function (error, stdout, stderr) {
                console.log('PDFFONTS');// stdout:'+stdout+' stderr:'+stderr);
                var out = stdout.split('\n');
                console.log(out.length);
                if (out.length > 3) {
                  res.write('data: '+id+': Page '+i+' of '+num+' already OCRed\n\n')
                  console.log('SANDY: stdout:'+stdout+' stderr:'+stderr);
                  i++;
                  ocr(i);
                } else {
                  cp.exec('pdfsandwich files/icc.ibc.2012_'+i+'.pdf', function (error, stdout, stderr) {
                    res.write('data: '+id+': OCR Page '+i+' of '+num+'\n\n')
                    console.log('SANDY: stdout:'+stdout+' stderr:'+stderr);
                    i++;
                    ocr(i);
                  });
                }
              });
            });
          } else {
            console.log('DONE ' + i + ' Pages');
            res.write('data: OCR Complete: '+i+' pages scanned\n\n')
            res.write('data: --COMPLETE--\n\n');
          }
        }
        ocr(i);
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
  var count = 0;
  var result = "";
  function done () {
    if (count >= 3) {
      if (result =="") {
        result = "OK";
      }
      res.status(200).send(result);
    } else {
        console.log(count);
        setTimeout(function() {
          console.log(count);
          done();
        }
        ,100);
    }
  }
  db.getParam(id, 'htmlurl', function (err, htmlurl) {
    db.getParam(id, 'pdfurl', function (err, pdfurl) {
      if (pdfurl) {
        fs.stat("files/"+id + ".pdf", function (err, stats) {
          if (err || !stats.isFile()) {
            result += "PDF file has not been downloaded\n";
            count++;
          } else {
            fs.stat("files/" +id+ "_0.png", function (err, stats) {
              if (err || !stats.isFile()) {
                result += "PDF pages have not been split\n";
                count++;
              } else {
                fs.stat("files/"+id+"_0.txt", function (err, stats) {
                  if (err || !stats.isFile()) {
                    result += "PDF pages have not been OCRed\n";
                  }
                  count++;
                });
              }
            });
          }
        });
      } else { count++; }
      if (htmlurl) {
        fs.stat("files/"+ id + ".html", function (err, stats) {
          if (err || !stats.isFile()) {
            result += "HTML file has not been downloaded\n";
          }
          count++;
        });
      } else { count++; }
      fs.stat("files/"+id + ".json", function (err, stats) {
        if (err || !stats.isFile()) {
          result += "JSON file has not been created\n";
        }
        count=count+1;
      });
    });
  });
  done();
});

app.listen(PORT);
console.log('Running on localhost:' + PORT);
