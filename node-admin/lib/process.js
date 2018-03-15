var fs = require('fs');
var db = require('./db.js');

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
    
      } else if (download ||  convert || tesseract || clean || mkdir) {
      //Download or Convert or Tesseract (Normal functions)
        var cp = require("child_process");
        cp.exec(process, function (error, stdout, stderr) {
          if (error || stderr) {
            reject(error);
          } else {
            resolve(stdout);
            //self.getNumberOfPages(id)
          }
        });
      } else {
      //Leftovers
      console.log("LEFTOVER: "+process);
      resolve();
      }
    });
  },
  go: function(id,page) {
    return new Promise(function(resolve, reject) {
      var pdffile = 'files/' + id + '/' + id + '.pdf';
      var tiffile = 'files/' + id + '/' + id + '_' + page + '.tif';
      var pngfile = 'files/' + id + '/img/' + id + '_' + page + '.png';
      var ocrfile = 'files/' + id + '/'+ id + '_' + page;
      var jsonfile = 'files/' + id + '/meta/'+ id + '_' + page + '.json';
      var json;

      db.getParams(id)
      .then((params) => {
        json = params;
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
        //Convert to TIF
        if (json.hocr) {
          return true;
        } else {
          return self.fileExists(tiffile);
        }
      })
      .then((tifexists) => {
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
        var p;
        if (!json.x || !json.y) {
          //Get Image Size:
          p = 'getSize '+id+'  '+page;
          db.addProcess(p);
        }
        if (!json.hocr) {
          //OCR:
          p = 'tesseract -c preserve_interword_spaces=1 ' + tiffile + ' ' + ocrfile + ' hocr';
          db.addProcess(p);
          p = 'getOCR '+id+' ' + page;
          db.addProcess(p);
        }
        return;
      })
      .then(() => {
        fs.writeFileSync(jsonfile,JSON.stringify(json));
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
      var jsonfile = 'files/' + id + '/meta/' + id + '_' + page + '.json';
      var cp = require("child_process");
      cp.exec('/app/bleve index files/index/index.bleve '+jsonfile, function (error, stdout, stderr) {
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
          
          db.setParam(id,'x',size.x)
          .then(() => {
            return db.setParam(id,'y',size.y);
          })
          .then((json) => {
            fs.writeFileSync(jsonfile, JSON.stringify(json));
            
            resolve();
          });
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
      
      self.fileExists(txtfile)
      .then((txtExists) => {
        if (!txtExists) {
          reject();
        } else {
          var text = fs.readFileSync(txtfile,'utf8');
          return text;
        }
      })
      .then((text) => {
        return db.setParam(id, 'hocr', text);
      })
      .then((json) => {
        
        fs.writeFileSync(jsonfile, JSON.stringify(json));
        
        resolve();
      })
      .catch((err) => {
        reject(err);
      });
    });
  }
  
};