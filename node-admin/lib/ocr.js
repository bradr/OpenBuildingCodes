var fs = require('fs');

var self = module.exports = {
    getNumberOfPages: function (id) {
      return new Promise(function(resolve, reject) {
        var cp = require("child_process");
        var inputfile = 'files/' + id + '.pdf'; 
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
        var inputfile = 'files/' + id + '.pdf';
        var outputfile = 'files/' + id + '_' + page + '.tif';
        var ocrfile = 'files/' + id + '_' + page;
    
        function convert() {
          return new Promise(function(resolve, reject) {
            var cp = require("child_process");
            cp.exec('convert -density 300 -compress Group4 -type bilevel -monochrome ' + inputfile + '[' + page + '] -flatten ' + outputfile, function (error, stdout, sderr) {
              if (error) {
                console.log(error);
                reject(error);
              } else {
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
        
        self.fileExists(inputfile)
        .then(function(inputExists) {
          if (!inputExists) { reject("Input File Does not exist"); }
        })
        .then(function() {
          return self.fileExists(outputfile);
        })
        .then(function(outputExists) {
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
          if (!ocrExists) {
            return tesseract();
          } else {
            return true;
          }
        })
        .then(function(allDone) {
          resolve(page+1);
        });
      });
    }
};