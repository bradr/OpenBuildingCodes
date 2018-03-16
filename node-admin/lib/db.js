var redis = require('redis');
var client = redis.createClient(6379, "redis");

var self = module.exports = {
  documentList: function (callback) {
    var documentList = [];
    client.exists('documents', function (err, exists) {
      if (exists) {
        client.lrange('documents',0,-1, function (err, docs) {
          for (var i=0; i< docs.length; i++) {
            client.get(docs[i], function (err, data) {
              if (data) {
                documentList.push(data);
              }
              if (documentList.length == docs.length) {
                callback(err, documentList);
              }
            });
          }
        });
      } else {
        callback([]);
      }
    });
  },
  addDocument: function (doc, callback) {
    var json = JSON.parse(doc);

    if (json.id) {
      client.exists(json.id, function (err, exists) {
        if (exists) {
          client.set(json.id, doc, function (err, result) {
            //console.log(JSON.stringify(doc));
            callback(err, result);
          });
        } else {
          client.rpush('documents', json.id, function (err, result) {
            client.incr('numberOfDocuments', function (err, result) {
              client.set(json.id, doc, function (err, result) {
                callback(err, result);
              });
            });
          });
        }
      });

    } else {
      var err = "Cannot add document, ID is empty";
      callback(err);
    }
  },
  deleteDocument: function (docid, callback) {
    client.decr('numberOfDocuments', function (err, result) {
      if (err) { callback(err); }
      var num = result + 1;
      client.del(docid, function (err, result) {
        if (err) { callback(err); }
        for (var i = 0; i < num; i++) {
          client.lpop('documents', function (err, value) {
            if (err) { callback(err); }
            if (value == docid) {
              callback(err, result);
            } else {
              client.rpush('documents', value, function () {});
            }
          });
       }
      });
    });
  },
  wipe: function (callback) {
    var th = this;
    client.set('numberOfDocuments', 0, function(error, result){});
    th.documentList(function (err, list) {
      if (!list) { callback (); }
      for (var i=0; i < list.length; i++) {
        var item = JSON.parse(list[i]);
        client.del(item.id, function (error, result) {
          client.lpop('documents', function (error, result) {
            if (i == list.length-1) {
              callback(error, result);
            }
          });
        });
      }
    });
  },
  readDocument: function (id, callback) {
    client.get(id, function (err, result) {
      callback(err, result);
    });
  },
  getParam: function (id, param, callback) {
    client.get(id, function (err, result) {
      if (err) {
        console.log(err);
        return;
      }
      var value = JSON.parse(result);
      if (value) {
        callback(err, value[param]);
      } else {
        return;
      }
    });
  },
  setParam: function (id, param, val, callback) {
    return new Promise(function(resolve, reject) {
      self.getParams(id)
      .then((values) => {
        //values = JSON.parse(values);
        values[param] = val;
        self.addDocument(JSON.stringify(values),function(error,result) {
          if (error) {
            reject();
          }
          resolve(values);
        });
      })
      .catch((error) => {
        reject(error);
      });
    });
  },
  getParams: function (id) {
    return new Promise(function(resolve,reject) {
      client.get(id, function (err, result) {
        if (err) {
          console.log(err);
          reject(err);
        }
        var value = JSON.parse(result);
        if (value) {
          resolve(value);
        } else {
          reject('ID '+id+' not found');
        }
      });
    });
  },
  
  addProcess: function(process) {
    return new Promise(function(resolve, reject) {
      module.exports.removeProcess(process).then(() => {
        client.rpush('processQueue',process,function(err,result) {
          if (!err) {
            resolve();
          } else {
            reject(err);
          }
        });
      });
    });
  },
  
  nextProcess: function() {
    return new Promise(function(resolve, reject) {
      client.lpop('processQueue', function(err, item) {
        if (err) {
          reject(err);
        } else { 
          resolve(item);
        }
      });
    });
  },
  nextProcessKeep: function() {
    return new Promise(function(resolve, reject) {
      client.lpop('processQueue', function(err, item) {
        if (err) {
            reject(err);
        }
        if (item) {
          client.lpush('processQueue',item, function(err) {
            if (err) {
              reject(err);
            } else { 
              resolve(item);
            }
          });
        } else {
          resolve();
        }
      });
    });
  },
  removeProcess: function(process) {
    return new Promise(function(resolve, reject) {
      client.lrem('processQueue',0,process, function(err, result) {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
    });
  },
  removeProcesses: function() {
    return new Promise(function(resolve, reject) {
      client.del('processQueue', function(err, result) {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
    });
  },
  getProcesses: function() {
    return new Promise(function(resolve, reject) {
      client.lrange('processQueue',0,-1, function(err, results) {
        if (!err) {
          resolve(results);
        } else {
          reject(err);
        }
      });
    });
  }
};
