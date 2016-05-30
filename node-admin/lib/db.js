var redis = require('redis');
var client = redis.createClient(6379, "redis");
//var client = new elasticsearch.Client({
//  host: 'search:9200',
//  log: 'trace'
//});

module.exports = {
  documentList: function (callback) {
    var documentList = [];
    client.exists('documents', function (err, exists) {
      if (exists) {
        client.lrange('documents',0,-1, function (err, docs) {
          for (var i=0; i< docs.length; i++) {
            client.get(docs[i], function (err, data) {
              if (data == null) { documentList.push("{}"); }
              else {
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
          var err = "Cannot add document, ID exists already";
          callback(err);
        } else {
          client.rpush('documents', json.id, function (err, result) {
            client.incr('numberOfDocuments', function (err, result) {
              client.set(json.id, doc, function (err, result) {
                callback(err, result);
              });
            });
          });
        }
      })

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
      var counter = 0;
      if (!list) { callback (); }
      for (var i in list) {
        var item = JSON.parse(list[i]);
        client.del(item.id, function (error, result) {
          client.lpop('documents', function (error, result) {
            if (i == list.length-1 && counter == list.length-1) {
              callback(error, result);
            }
            counter++;
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
      var value = JSON.parse(result);
      callback(err, value[param]);
    });
  }
};
