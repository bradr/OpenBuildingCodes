var express = require('express');
var hbs = require('express-handlebars');
var bodyParser = require('body-parser');
//var search = require('./lib/search.js');
var db = require('./lib/db.js');
var ocr = require('./lib/ocr.js');

var fs = require('fs');

var PORT = 8081;

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
  
  //Extract the id from the url
  if (!json.id) {
    var parts = json.pdfurl.split('/');
    json.id = parts[parts.length-2];
  }

  //Post to database
  db.addDocument(JSON.stringify(json), function (err, result) {

    if (err) {
      res.status(400).send(err);
    } else {
      res.status(200).send(result);
    }
  });

});
//Delete document data
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
        cp.exec('mkdir files/'+id, function(error,response) {
          var process = cp.spawn('curl', ["-o", "files/"+id+"/"+id+".pdf", "-L", pdfurl]);
          res.write('data: PDF Download Started\n\n');

          process.stderr.on('data', function (data) {
            var str = data.toString();
            if (str.match(/\dM/g)) {
              res.write('data: PDF '+ str + '\n\n');
            }
          });
          process.on('close', function (code) {
            res.write('data: --EOF--\n\n');
          });
          process.on('error', function (err) {
            console.log('ERROR: '+err);
          }); 
          
          
          
        });
      } else {
        res.write("data: PDF--none--\n\n");
      }
    });
  });
});

app.get('/admin/ocr/:id', function (req, res, next) {
  var id = req.params.id;
  db.readDocument(id, function (err, values) {
    if (err) {
      console.log('error: '+err)
      res.status(500).send(err);
    } else {
      values = JSON.parse(values);
      ocr.getNumberOfPages(id)
      .then(function(num) {
        res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-control": "no-cache"});
        res.write('data: Initializing OCR function\n\n');
        res.write('data: ' + id + ': OCRing ' + num + ' Pages'+'\n\n');
        function loop(page) {
          var start = Date.now();
          ocr.ocr(id,page)
          .then(function(page) {
            var body = fs.readFileSync('files/'+id+'/'+id+'_'+page+'.txt',"utf8");
            values.page = page;
            values.body = body;
            //console.log(values.body);
            fs.writeFileSync('files/'+id+'/meta/'+id+'_'+page+'.json',JSON.stringify(values));
            
            if (page < num) {
              var duration = Date.now()-start;
              res.write('data: ' + id + ': OCR Page ' + page + ' of ' + num + ', Took: ' + duration + 'ms\n\n');
              loop(page+1);
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
        res.status(500).send(err);
      });
    }
  });
});

app.delete('/admin/index', function (req, res, next) {
  var cp = require("child_process");    
  cp.exec('rm -rf /app/files/index/index.bleve', function(error,stdout,stderr) {
    if (error) {
      res.status(500).send("Error removing index " + error);
    } else {
      cp.exec('/app/bleve create /app/files/index/index.bleve', function (error, stdout, stderr) {
        if (error) {
          res.status(500).send("Error creating index "+error);
        } else {
          res.status(200).send("Success");
        }
      });
    }
  });
});

app.get('/admin/index/:id', function (req, res, next) {
  var id = req.params.id;
  var cp = require("child_process");
  
  //cp.exec('/app/bleve index index/index.bleve files/'+id+'/'+id+'_10*.json', function (error, stdout, stderr) {
    
  //var process = cp.spawn('pwd',["-P"], {cwd:'/app/'});  
  var process = cp.spawn('/app/bleve', ["index","/app/files/index/index.bleve", "/app/files/"+id+"/meta/"]);
  
  res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-control": "no-cache"});
  res.write('data: Indexing \n\n');

  process.stderr.on('data', function (data) {
    var str = data.toString();
    console.log(str);
  });
  process.stdout.on('data', function (data) {
    var str = data.toString();
    console.log(str);
  });
  process.on('close', function (code) {
    console.log('closed: '+code);
  });
  process.on('error', function (err) {
    console.log('ERROR: '+err);
  });     
    
    
    
  //   if (error) {
  //     console.log(error);
  //     res.status(500).send("Error");
  //   } else {
  //     console.log(stdout);
  //     res.status(200).send(stdout);
  //   }
  // });
});

app.get('/admin/getInfo/:id', function (req, res, next) {
  var id = req.params.id;
  db.readDocument(id, function(err, doc) {
    if (err) {
      res.status(500).send("Error "+err);
    } else {
      var request = require('request');
      doc = JSON.parse(doc);
      var url = doc['pdfurl'].replace(/\/[^/]*$/, "/");
      url = url.replace(/download/, "details");
      //console.log(url);
      request(url, function(error, response, html) {
        var cheerio = require('cheerio');
        $ = cheerio.load(html);
        doc.title = $.root().find("title").text().split(' : ')[0];
        $('.key').each(function(i,elem) {

          if ($(this).text() == 'by') {
            doc.by = $(this).next().text();
          } else if ($(this).text() == 'Collection') {
            doc.collection = $(this).next().text();
          } else if ($(this).text() == 'Language') {
            doc.language = $(this).next().text();
          } else if ($(this).text() == 'Ppi') {
            doc.ppi = $(this).next().text();
          }
        });
        $('.key-val-big').each(function(i,elem) {
          if ($(this).text().match("Usage")) {
            doc.usage = $(this).children().text();
          } else if ($(this).text().match("Topics")) {
            doc.topics = $(this).children().text();
          }
        });
        doc.description = $('#descript').html();
        db.addDocument(JSON.stringify(doc), function (err, result) {
          if (err) {
            res.status(500).send(err);
          } else {
            res.status(200).send('Success');
          }
        });
      });
    }
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
          fs.stat("files/"+id+"/"+ id + ".html", function (err, stats) {
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
      db.getParam(id, 'pdfurl', function(err, url) {
        if (err) {
          reject(err);
        }
        if (url) {
          fs.stat("files/"+id+"/"+id + ".pdf", function (err, result) {
            if (err) {
              resolve(err);
            } else if (!result) {
              resolve(id + " PDF File: Not Downloaded");
            } else {
              if (!result.isFile()) {
                resolve(id + " PDF File: Not Downloaded");
              } else {
                resolve(id + " PDF File: Downloaded");
              }
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
        fs.stat("files/" + id + "/img/" +id+ "_" + (pages-1) + ".tif", function(err, result) {
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
        fs.stat("files/"+id+"/"+id+"_" + (pages-1) + ".txt", function(err, result) {
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
