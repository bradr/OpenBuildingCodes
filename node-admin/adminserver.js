var express = require('express');
var hbs = require('express-handlebars');
var bodyParser = require('body-parser');
var db = require('./lib/db.js');

var processRunner = false;

var fs = require('fs');

var PORT = 8081;

var app = express();

app.engine('hbs', hbs({extname: 'hbs', defaultLayout: 'main'}));
app.set('view engine', 'hbs');

app.use(bodyParser.json({ type: 'application/*+json' }));
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

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

function processRun() {
  return new Promise(function(resolve, reject) {
    if (!processRunner) {
      resolve();
    } else {
      var process = require('./lib/process.js');
      
      db.nextProcess()
      .then((proc) => {
        if (!proc) {
          resolve();
        } else {
          process.run(proc)
          .then(() => {
            if (!processRunner) {
              db.addProcess(proc);
              resolve();
            } else {
              resolve(db.nextProcessKeep());
            }
          })
          .catch((err) => {
            console.log(err);
            if (proc) {
              db.addProcess(proc);
            }
            if (!processRunner) {
              resolve();
            } else {
              resolve(db.nextProcessKeep());
            }
          });
        }
      })
      .catch((err) => {
        console.log(err);
      });
    }
  });
}

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
  db.getParams(id) //, function(err, params) {
  .then((params) => {
    //var p = 'mkdir files/'+id+'/ && mkdir files/'+id+'/img/ && mkdir files/'+id+'/meta/ && curl -o files/' + id + '/' + id + '.pdf -L ' + params.pdfurl;
    //db.addProcess(p)
    
    //Download file if it hasn't been already:
    db.addProcess('mkdir files/'+id)
    .then(db.addProcess('mkdir files/'+id+'/img/'))
    .then(db.addProcess('mkdir files/'+id+'/meta/'))
    .then(db.addProcess('curl -o files/' + id + '/' + id + '.pdf -L ' + params.pdfurl))
    .then(() => {
      res.status(200).send();
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send(err);
    });
  })
  .catch((err) => {
    console.log('error: '+err);
    res.status(500).send(err);
  });
});

app.get('/admin/process/:id', function (req, res, next) {
  var id = req.params.id;
  var process = require('./lib/process.js');
  
  //Process
  db.getParams(id)
  .then((params) => {
    var pages = params.pages;
    if (!pages) {
      process.getNumberOfPages(id)
      .then((num) => {
        db.setParam(id,'pages',parseInt(num));
        return num;
      });
    } else {
      return pages;
    }
  })
  .then((pages) => {
    //Loop through all pages:
    let promiseChain = [];
    for (var i=0; i<pages; i++) {
      promiseChain.push(process.go(id,i+1));
    }
    
    Promise.all(promiseChain).then(function() { return; });
  })
  .then(() => {
    res.status(200).send();
  })
  .catch((err) => {
    console.log('error: '+err);
    res.status(500).send(err);
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
});

app.get('/admin/getInfo/:id', function (req, res, next) {
  var id = req.params.id;
  db.readDocument(id, function(err, doc) {
    if (err) {
      res.status(500).send("Error "+err);
    } else {
      var request = require('request');
      doc = JSON.parse(doc);
      //Archive.org rules:
      if (doc['pdfurl'].match('archive.org')) {
        var url = doc['pdfurl'].replace(/\/[^/]*$/, "/");
        doc.url = url.replace(/download/, "details");
        request(doc.url, function(error, response, html) {
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
            } else if ($(this).text() == 'Publication Date') {
              doc.pubdate = $(this).next().text();
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
    }
  });
});

app.delete('/admin/deleteProcess', function (req, res, next) {
  console.log(req.body.process);
  db.removeProcess(req.body.process)
  .then(() => {
    res.status(200).send();
  })
  .catch((err) => {
    console.log(err);
    res.status(500).send(err);
  });
});


app.delete('/admin/deleteProcesses', function (req, res, next) {
  db.removeProcesses()
  .then(() => {
    res.status(200).send();
  })
  .catch((err) => {
    console.log(err);
    res.status(500).send(err);
  });
});

app.get('/admin/getProcesses', function (req, res, next) {
  db.getProcesses()
  .then((results) => {
    res.status(200).send({"processes":results});
  })
  .catch((err) => {
    console.log(err);
    res.status(500).send(err);
  });
});

app.get('/admin/stop', function (req, res, next) {
  if (processRunner) {
    //Pause:
    processRunner = false;
  }
  res.status(200).send();
});

app.get('/admin/run', function (req, res, next) {
  var proc = [];
  if (processRunner) {
    //Pause:
    processRunner = false;
  } else {
    //Run:
    processRunner = true;
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-control": "no-cache"});
    var cpuStat = require('cpu-stat');
    var cores = cpuStat.totalCores();
    
    function run(i) {
      cpuStat.usagePercent(function(err, percent) {
        console.log('CPU:'+percent+'('+cores+' cores)');
        res.write('data: CPU '+percent+' ('+cores+' cores)'+'\n\n');
      });

      processRun()
      .then((result) => {
        if (result) {
          proc[i] = result;
          res.write('data: '+proc.toString()+' \n\n');
          run(i);
        } else {
          processRun()
          .then(() => {
            processRunner =false;
            res.write('data: Completed\n\n');
            return;
          });
        }
      });
    }
    
    for (var i=0;i<cores;i++) {
      run(i);
    }
  
  }
});

app.listen(PORT);
console.log('Running on localhost:' + PORT);