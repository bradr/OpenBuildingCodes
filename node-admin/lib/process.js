var fs = require('fs');

var self = module.exports = {
  
  run: function (process) {
    return new Promise(function(resolve, reject) {
      var size = process.match(/^getSize\s([^\s]*)\s+(\d*)/i);
      var ocr = process.match(/^getOCR\s([^\s]*)\s+(\d*)/i);
      var download = process.match(/curl\s/i);
      var convert = process.match(/^convert\s/i);
      var tesseract = process.match(/^tesseract\s/i);
      var mkdir = process.match(/^mkdir\s/i);
      var clean = process.match(/^rm\s/i);
      var bleve = process.match(/bleve\s/i);
 
      if (size) {
      //getSize: 
        if (size[1] && size[2]) {
          self.getSize(size[1],size[2])
          .then(() => {
            resolve();
          })
          .catch((err) => {
            reject(err);
          });
        }
    
      } else if (ocr) {
        var id = ocr[1];
        var page = ocr[2];
      //getOCR:
        if (id && page) {
          self.getOCR(id,page)
          .then(() => {
            //var p = 'rm -f files/'+id+ '/' + id + '_'+page+'.*';
            //db.addProcess(p);
            resolve();
          })
          .catch((err) => {
            reject(err);
          });
        }
    
      } else if (download ||  convert || tesseract || clean || mkdir || bleve) {
      //Download or Convert or Tesseract (Normal functions)
        var cp = require("child_process");
        cp.exec(process, function (error, stdout, stderr) {
          if (error) {
            reject(error);
          } else {
            resolve(stdout);
          }
        });
      } else {
      //Leftovers
      console.log("LEFTOVER: "+process);
      resolve();
      }
    });
  },
  processPage: function(id,page) {
    var db = require('./db.js');
    return new Promise(function(resolve, reject) {
      var pdffile = 'files/' + id + '/' + id + '.pdf';
      var tiffile = 'files/' + id + '/' + id + '_' + page + '.tif';
      var pngfile = 'files/' + id + '/img/' + id + '_' + page + '.png';
      var ocrfile = 'files/' + id + '/'+ id + '_' + page;
      var jsonfile = 'files/' + id + '/meta/'+ id + '_' + page + '.json';
      var indexfile = 'files/index/files/'+ id + '_' + page + '.json';
      var json;

      self.fileExists(jsonfile)
      .then((exists) => {
        if (exists) {
          json = JSON.parse(fs.readFileSync(jsonfile,'utf8'));
          return;
        } else {
          db.getParams(id)
          .then((params) => {
            json = params;
            json.hocr='';
            json.x='';
            json.y='';
            fs.writeFileSync(jsonfile, JSON.stringify(json));
            return;
          });
        }
      }).then(() => {
        return self.fileExists(pdffile);
      })
      .then((exists) => {
        if (!exists) {
          //Download file if it hasn't been already:
          db.addProcess('mkdir files/'+id)
          .then(db.addProcess('mkdir files/'+id+'/img/'))
          .then(db.addProcess('mkdir files/'+id+'/meta/'))
          .then(db.addProcess('curl -o files/' + id + '/' + id + '.pdf -L ' + json.pdfurl))
          .then(() =>{
            return;
          });
        } else {
          return;
        }
      })
      .then(() => {
        return self.fileExists(ocrfile+'.hocr');
      })
      .then((ocrexists) => {
        if (json.hocr || ocrexists) {
          return true;
        } else {
          return self.fileExists(tiffile);
        }
      })
      .then((tifexists) => {
        //Convert to TIF
        if (!tifexists) {
          var p = 'convert -density 300 -compress Group4 -type bilevel -monochrome ' + pdffile + '[' + parseInt(page-1) + '] -flatten ' + tiffile;
          db.addProcess(p);
          return;
        } else {
          return;
        }
      })
      .then(() => {
        //Convert to PNG
        return self.fileExists(pngfile);
      })
      .then((pngexists) => {
        if (!pngexists) {
          var p = 'convert -density 300 -monochrome ' + pdffile + '[' + parseInt(page-1) + '] -flatten ' + pngfile;
          db.addProcess(p);
          return;
        } else {
          return;
        }
      })
      .then(() => {
        return self.fileExists(ocrfile+'.hocr');
      })
      .then((ocrexists) => {
        var p;
        if (!json.x || !json.y) {
          //Get Image Size:
          p = 'getSize '+id+'  '+page;
          db.addProcess(p);
        }
        if (!json.hocr) {
          if (!ocrexists) {
            //OCR:
            p = 'tesseract -c preserve_interword_spaces=1 ' + tiffile + ' ' + ocrfile + ' hocr';
            db.addProcess(p);
          }
          p = 'getOCR '+id+' ' + page;
          db.addProcess(p)
          .then(() => {
            return;
          });
        } else{
          return;
        }
      })
      .then(() => {
        return self.fileExists(indexfile);
      })
      .then((indexexists) => {
        if (!indexexists) {
          db.addProcess('getOCR '+id+' '+page);
        }
        return;
      })
      // .then(() => {
      //   //Clean Up
      //   var p = 'rm -f files/'+id+ '/' + id + '_'+page+'.*';
      //   db.addProcess(p);
      // })
      .catch((err) =>{
        console.log(err);
        reject(err);
      });
    });
  },
  addPages: function(id) {
    var db = require('./db.js');
    //Add each page
    return new Promise(function(resolve, reject) {
      db.getParams(id)
      .then((params) => {
        var pages = params.pages;
        if (!pages) {
          self.getNumberOfPages(id)
          .then((num) => {
            db.setParam(id,'pages',parseInt(num));
            return num;
          })
          .catch((err) => {
            reject(err);
          });
        } else {
          return pages;
        }
      })
      .then((pages) => {
        //Loop through all pages:
        let promiseChain = [];
        for (var i=0; i<pages; i++) {
          promiseChain.push(self.processPage(id,i+1));
        }
        
        Promise.all(promiseChain).then(function() { return; });
      })
      .then(() => {
        resolve();
      })
      .catch((err) => {
        reject(err);
      });
    });
  },
  
  
  getNumberOfPages: function (id) {
    return new Promise(function(resolve, reject) {
      var cp = require("child_process");
      var inputfile = 'files/' + id + '/' + id + '.pdf'; 
      cp.exec('pdftk ' + inputfile + ' dump_data | grep NumberOfPages', function (error, stdout, stderr) {
        if (error) {
          console.log(error);
          reject(error);
        }
        resolve(stdout.match(/\d+/));
      });
    });
  },
  
  fileExists: function (file) {
    return new Promise(function(resolve, reject) {
      fs.stat(file, function (err, stats) {
        if (err) {
          resolve(false);
        }
        if (!stats || !stats.isFile()) {
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  },
  
  index: function (id, page) {
    return new Promise(function(resolve, reject) {
//      var jsonfile = 'files/' + id + '/meta/' + id + '_' + page + '.json';
      var cp = require("child_process");
      cp.exec('/app/bleve index files/index/index.bleve /files/index/files/', function (error, stdout, stderr) {
        if (error) {
          console.log(error);
          reject(error);
        }
        else {
          resolve(stdout);
        }
      });
    });
  },
  
  getSize(id, page) {
    return new Promise(function(resolve,reject) {
      var cp = require("child_process");
      var tiffile = 'files/' + id + '/' + id + '_' + page + '.tif';
      var jsonfile = 'files/' + id + '/meta/' + id + '_' + page + '.json';
      cp.exec('identify -format "%wx%h" ' + tiffile, function(error, stdout, stderr) {
        if (stdout) {
          var size = {
            x: stdout.match(/[^x]+/g)[0],
            y: stdout.match(/[^x]+/g)[1]
          };
          
          var json = JSON.parse(fs.readFileSync(jsonfile,'utf8'));
          if (json) {
            json.x = size.x;
            json.y = size.y;
          } else {
            json = {'x':size.x,'y':size.y};
          }
          fs.writeFileSync(jsonfile, JSON.stringify(json));
          resolve();
        } else {
          reject(stderr);
        }
      });
    });
  },
  
  getOCR(id, page) {
    return new Promise(function(resolve,reject) {
      var txtfile = 'files/' + id + '/' + id + '_' + page + '.hocr';
      var jsonfile = 'files/' + id + '/meta/' + id + '_' + page + '.json';
      var indexfile = 'files/index/files/' + id + '_' + page + '.json';
      
      self.fileExists(txtfile)
      .then((txtExists) => {
        if (!txtExists) {
          reject('No File yet');
        } else {
          var text = fs.readFileSync(txtfile,'utf8');
          return text;
        }
      })
      .then((text) => {
        var json = JSON.parse(fs.readFileSync(jsonfile,'utf8'));
        if (json) {
          json.hocr = text;
        } else {
          json = {'hocr':text};
        }
        return json;
      })
      .then((json) => {
        fs.writeFileSync(jsonfile, JSON.stringify(json));
        
        json.body = json.hocr.replace(/<[^>]+>/g, ' ');
        json.body = json.body.replace(/\s\s+/g, ' ');
        json.body = json.body.replace(/\\n\s(\\n\s)+/g, '\n');
        json.hocr='';
        fs.writeFileSync(indexfile, JSON.stringify(json));
        resolve();
      })
      .catch((err) => {
        reject(err);
      });
    });
  },
  
  countPng(id) {
    return new Promise(function(resolve, reject) {
      var cp = require("child_process");
      cp.exec('ls files/' + id + '/img/ | wc -l', function (error, stdout, stderr) {
        if (stdout) {
          resolve(stdout);
        } else {
          reject("Missing Png files");
        }
      });
    });
  },
  countMeta(id) {
    return new Promise(function(resolve, reject) {
      var cp = require("child_process");
      cp.exec('ls files/' + id + '/meta/ | wc -l', function (error, stdout, stderr) {
        if (stdout) {
          resolve(stdout);
        } else {
          reject("Missing Meta files");
        }
      });
    });
  },
  checkMeta(id) {
    return new Promise(function(resolve, reject) {
      var db = require('./db.js');
      db.getParams(id)
      .then((doc) =>{
        var pages = doc.pages;
        for (var i=0; i<pages; i++) {
          try{
            var json = JSON.parse(fs.readFileSync('files/' + id + '/meta/' + id + '_' + (i+1) + '.json'));
          } catch (err) {
            reject(i + ' meta file missing '+err);
          }
          if (json) {
            if (!json.hocr) {
              reject('No OCR: ' + i);
            }
          } else {
            reject('No meta file: '+i);
          }
        }
        resolve(pages);
      });
    });
  },

  countIndex(id) {
    return new Promise(function(resolve, reject) {
      var cp = require("child_process");
      cp.exec('ls files/index/files/ | wc -l', function (error, stdout, stderr) {
        if (stdout) {
          resolve(stdout);
        } else {
          reject(error);
        }
      });
    });
  },
  checkIndex(id) {
    return new Promise(function(resolve, reject) {
      var num = 0;
      var db = require('./db.js');
      db.getParams(id)
      .then((doc) =>{
        var pages = doc.pages;
        for (var i=0; i<pages; i++) {
          try {
            var json = JSON.parse(fs.readFileSync('files/index/files/' + id + '_' + (i+1) + '.json'));
          } catch (err) {
            reject(i + ' missing index file '+err);
          }
          if (json) {
            if (!json.body) {
              reject('No index OCR: ' + i);
            } else {
              num++;
            }
          } else {
            reject('No index file: '+i);
          }
        }
        resolve(num);
      });
    });
  }
};
