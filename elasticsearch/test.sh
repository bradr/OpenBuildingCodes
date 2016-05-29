curl -X DELETE "172.17.0.5:9200/test"
curl -X PUT "172.17.0.5:9200/test"
curl -X PUT "172.17.0.5:9200/test/person/_mapping" -d '
{
  "person": {
    "properties": {
      "file": {
        "type": "attachment",
        "fields": {
          "content_type": {
            "type": "text",
            "store": true
          }
        }
      }
    }
  }
}'
curl -X PUT "172.17.0.5:9200/test/person/1?refresh=true" -d '
{
  "file": "IkdvZCBTYXZlIHRoZSBRdWVlbiIgKGFsdGVybmF0aXZlbHkgIkdvZCBTYXZlIHRoZSBLaW5nIg=="
}'
sleep 5
curl -X GET "172.17.0.5:9200/test/person/_search" -d '
{
  "fields": [ "file.content" ],
  "query": {
    "match": {
      "_all": "the"
    }
  }
}'
