var express = require('express');
var hbs = require('express-handlebars');
var bodyParser = require('body-parser');
var db = require('./lib/db.js');
var process = require('./lib/process.js');

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
            console.log('Error, readding proc: '+proc+' : '+err);
		if (err) {
            if (err.match(/Files exists/i)) {
              resolve(db.nextProcessKeep());
		}
            } else if (proc) {
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
  json = req.body;
  
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
//  var Converter = require('csvtojson').Converter;
//  var csvtojson = new Converter({});
//  csvtojson.fromFile('./files/database.csv', function (error, data) {
  fs.readFile('files/database.json', function(err, datafile) {
    datafile = datafile.toString().substr(1).slice(0,-1);
    var data = datafile.split("},");
for (var i = 0; i < data.length-1; i++) {
  data[i] += '}';
}
    db.wipe(function (err, result) {
      var counter = 0;
      for (var i in data) {
        db.addDocument(data[i],function (error, result) {
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
  //var json2csv = require('json2csv');
  db.documentList(function (err, json) {
    var csv;
    json = '[' + json + ']';
//    json2csv(JSON.parse(json), function (err, csv) {
//      if (err) {
        //res.status(500).send(err)

//      } else {
        fs.writeFile('files/database.json', json, function (err, result) {
          if (err) {
            //res.status(500).send(err);
            console.log(err);
          } else {
            res.status(200).send(result);
          }
        });
//      }
//    });
  });
});


app.get('/admin/download/:id', function (req, res, next) {
  var id = req.params.id;
  db.getParams(id) //, function(err, params) {
  .then((params) => {
    //Download file if it hasn't been already:
    db.addProcess('mkdir files/'+id)
    .then(db.addProcess('mkdir files/'+id+'/img/'))
    .then(db.addProcess('mkdir files/'+id+'/meta/'))
//    .then(db.addProcess('mkdir files/'+id+'/index/'))

    .then(() => {
      process.fileExists('files/'+id+'/'+id+'.pdf')
      .then((exists) => {
        if (exists) {
          return;
        } else {
          db.addProcess('curl -o files/' + id + '/' + id + '.pdf -L ' + params.pdfurl);
        }
      });
    })
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
  
  process.addPages(id)
  .then(() => {
    res.status(200).send();
  })
  .catch((err) => {
    console.log('error: '+err);
    res.status(500).send(err);
  });
});

app.get('/admin/processAll', function (req, res, next) {
  db.documentList(function(error, list) {
    function loop(i) {
      process.addPages(JSON.parse(list[i]).id)
      .then(() => {
        i++;
        if (i < list.length) {
          loop(i);
        } else {
          res.status(200).send(i.toString());
        }
      })
      .catch((err) => {
        console.log('error: '+err);
      res.status(500).send(err);
      });
    }
    loop(0);
  });
});

app.delete('/admin/index', function (req, res, next) {
  var cp = require("child_process");    
  cp.exec('rm -rf /app/files/index/index.bleve', function(error,stdout,stderr) {
    if (error) {
      res.status(500).send("Error removing index " + error);
    } else {
      var cp = require("child_process");
      cp.exec('/app/bleve create -m /app/files/index/mapping.json /app/files/index/index.bleve', function (error, stdout, stderr) {
        if (error) {
          res.status(500).send("Error creating index "+error);
        } else {
          res.status(200).send("Success");
        }
      });
    }
  });
});

app.get('/admin/index', function (req, res, next) {
  var id = req.params.id;
  var cp = require("child_process");
  cp.exec('/app/bleve index /app/files/index/index.bleve /app/files/index/files/', function(error, stdout, stderr) {
    if (error) {
	console.log(error);
      res.status(500).send("Error reindexing " + error);
    } else {
      res.status(200).send("Success: " + stdout);
    }
  });
});

app.get('/admin/index/:id', function (req, res, next) {
  var id = req.params.id;
  process.fileExists('/app/files/index/index.bleve')
  .then((exists) => {
    if (!exists) {
      var cp = require("child_process");
      cp.exec('mkdir /app/files/index/');
    }
    return process.getNumberOfPages(id);
  })
  .then((pages) => {
    for (var i=0;i<pages;i++) {
      //db.addProcess('/app/bleve index /app/files/index/index.bleve /app/files/'+id+'/index/'+id+'_'+(i+1)+'.json');
	var cp = require("child_process");
	cp.exec('/app/bleve index /app/files/index/index.bleve /app/files/index/files/*.json');
    }
  })
  .then(() => {
    res.status(200).send();
  })
  .catch((err) => {
    console.log(err);
    res.status(500).send(err);
  });
  
/*
  var cp = require("child_process");
  
  var process = cp.spawn('/app/bleve', ["index","/app/files/index/index.bleve", "/app/files/"+id+"/index/"]);
  
  res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-control": "no-cache"});
  res.write('data: Indexing \n\n');

  process.stderr.on('data', function (data) {
    var str = data.toString();
    console.log(str);
  });
  process.stdout.on('data', function (data) {
    var str = data.toString();
    console.log(str);
    res.write('data:'+str+' \n\n');
  });
  process.on('close', function (code) {
    console.log('closed: '+code);
    res.write('data: complete \n\n');
  });
  process.on('error', function (err) {
    console.log('ERROR: '+err);
  }); 
*/
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















app.get('/admin/check/:id', function (req, res, next) {
  var id = req.params.id;
  res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-control": "no-cache"});
  
  var p1 = new Promise(function(resolve, reject) {
    process.countPng(id)
    .then((png) => {
      console.log('1');
      res.write('data: Png: '+png+ ' files\n\n');
      resolve();
    })
    .catch((error) => {
      res.write('data: Error with png files: '+ error +'\n\n');
      resolve();
    });
  });
  
  var p2 = new Promise(function(resolve, reject) {
    process.countMeta(id)
    .then((meta) => {
      console.log('2');
      res.write('data: Meta: '+meta+ ' files\n\n');
      resolve();
    })
    .catch((error) => {
      res.write('data: Error with meta files: '+ error +'\n\n');
      resolve();
    });
  });
  
  var p3 = new Promise(function(resolve,reject) {
    process.countIndex(id)
    .then((index) => {
      console.log('3');
      res.write('data: Index: '+index+ ' files\n\n');
      resolve();
    })
    .catch((error) => {
      res.write('data: Error with index files: '+ error +'\n\n');
      resolve();
    });
  });
  
  var p4 = new Promise(function(resolve,reject) {
    process.checkMeta(id)
    .then((meta) => {
      console.log('4');
      res.write('data: MetaOcr: '+meta+' files\n\n');
      resolve();
    })
    .catch((error) => {
      res.write('data: '+ error +'\n\n');
      resolve();
    });
  });
  
  var p5 = new Promise(function(resolve,reject) {
    process.checkIndex(id)
    .then((index) => {
      console.log('5');
      res.write('data: IndexOcr: '+ index + ' files\n\n');
      resolve();
    })
    .catch((error) => {
      res.write('data: '+ error +'\n\n');
      resolve();
    });
  });
  
  Promise.all([p1,p2,p3,p4,p5])
  .then(() => {
    res.write('data: Completed\n\n');
  })
  .catch((error) => {
    res.write('data: Error\n\n');
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
            var finished = true;
            for (var i=0; i<proc.length; i++) {
              if (proc[i]) {
                finished = false;
              }
            }
            if (finished) {
              processRunner =false;
              res.write('data: Completed\n\n');
            }
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
