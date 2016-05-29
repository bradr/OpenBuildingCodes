//Library to talk to redis database
//var redis = require('redis'),
//        client = redis.createClient();

//client.on("error", function (err) {
//  console.log("Error " + err);
//});

//List Sources:
// Returns as a JSON blob
// {
//  "source1": [
//    "url": "http://url"
//    "title": "Source Title"
//    "author": "Document Author"
//    "status": "Up to date" //"Not up to date", "URL moved"
//  ]
//  "source2": [
//  ]
// }

redisConnect = function () {
  var redisHost  = process.env.DB_PORT_6379_TCP_ADDR;
  var redisPort  = process.env.DB_PORT_6379_TCP_PORT;
  var redis = require('redis'),
          client = redis.createClient(redisPort,redisHost);
  return client;
}

exports.listSources = function (callback) {
  var client = redisConnect();
  client.get("sources", function(err, output){
    console.log("Data:"+output);
    var sources = JSON.parse(output);
    client.quit();
    return callback(sources);
  });
}

exports.editSources = function (data) {
  var client = redisConnect();
  var newdata = [];
  var i = 0;
  data = JSON.parse(data);
  for(var key in data) {
    if (data[key].url) {
      newdata[i] = data[key];
      i++;
    }
  }
  client.set("sources", JSON.stringify(newdata), function(err, output){
    client.quit();
    return;
  });
}

//Check if the document has changed
exports.checkDocument = function (url) {
  var localText = "";//check redis database for url
  var documentText = "";//curl URL
  //Compare the text
  return true; //or false, or "URL no longer exists"
}

function async(callback, args) {
  console.log('do something with \''+args+'\', return 1 sec later');
  setTimeout(function() { callback(args); }, 1000);
}
