var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
  host: 'search:9200',
  log: 'trace'
});

module.exports = {
  createIndex: function (callback) {
    client.indices.create({"index": "codes"});
    callback();
  },
  search: function (query, callback) {
    client.search({
      index: 'codes',
      body: {
        query: {
          match: {
            '_all': query
          }
        },
        highlight: {
          fields: {
            'file.content': {}
          }
        }
      }
    }, function (error, response) {
      if (response && !response.error) {
        if (response.hits.total>0){
          var results = { 'highlight': response.hits.hits[0].highlight['file.content'][0], 'id': response.hits.hits[0]._id };
        } else {
          var results = "None";
        }
        callback(error, results);
      }
      client.indices.close();

    });
  }
};
