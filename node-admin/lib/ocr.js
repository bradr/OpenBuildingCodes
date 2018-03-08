var fs = require('fs');

var self = module.exports = {
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
    
    ocr: function (id, page) {
      return new Promise(function(resolve, reject) {
        var inputfile = 'files/' + id + '/' + id + '.pdf';
        var outputfile = 'files/' + id + '/' + id + '_' + page + '.tif';
        var outputfile2 = 'files/' + id + '/img/' + id + '_' + page + '.png';
        var ocrfile = 'files/' + id + '/'+ id + '_' + page;
        var jsonfile = 'files/' + id + '/meta/' + id + '_' + page + '.json';
    
        function convert() {
          return new Promise(function(resolve, reject) {
            var cp = require("child_process");
            cp.exec('convert -density 300 -compress Group4 -type bilevel -monochrome ' + inputfile + '[' + page + '] -flatten ' + outputfile, function (error, stdout, sderr) {
              if (error) {
                console.log(error);
                reject(error);
              } else {
                cp.exec('convert -density 300 -monochrome ' + inputfile + '[' + page + '] -flatten ' + outputfile2, function (error, stdout, sderr) {
                });
                resolve(stdout);
              }
            });
          });
        }
        function tesseract() {
          return new Promise(function(resolve, reject) {
            var cp = require("child_process");
            cp.exec('tesseract ' + outputfile + ' ' + ocrfile, function (error, stdout, stderr) {
              if (error) {
                console.log(error);
                reject(error);
              }
              else {
                resolve(stdout);
              }
            });
          });
        }
        function bleve() {
          return new Promise(function(resolve, reject) {
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
        }
        
        
        var start = Date.now();
        var time1,time2,time3;
        self.fileExists(inputfile)
        .then(function(inputExists) {
          if (!inputExists) { reject("Input File Does not exist"); }
        })
        .then(() => {
          return self.fileExists(outputfile);
        })
        .then(function(outputExists) {
          time1 = Date.now() - start;
          if (!outputExists) {
            return convert();
          } else { 
            return true;
          }
        })
        .then(function() {
          return self.fileExists(ocrfile+".txt");
        })
        .then(function(ocrExists) {
          time2 = Date.now() - start - time1;
          if (!ocrExists) {
            return tesseract();
          } else {
            return true;
          }
        })
        .then((message) => {
          return bleve();
        })
        .then(function(allDone) {
          time3 = Date.now() - start - time1 - time2;
          //console.log('Pre:'+time1+'ms Convert:'+ time2+ 'ms Tess:'+time3+'ms');
          resolve(page);
        });
      });
    }
};