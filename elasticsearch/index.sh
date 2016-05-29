#!/bin/sh
curl -X DELETE "127.0.0.1:9200/docs"
curl -X PUT "127.0.0.1:9200/docs"
curl -X PUT "127.0.0.1:9200/docs/doc/_mapping" -d '{
   "doc" : {
     "properties" : {
       "file" : {
         "type": "attachment",
         "fields": {
           "content": {
             "type": "string",
             "term_vector": "with_positions_offsets",
             "store": true
           }
         }
       }
     }
   }
 }'



coded=`cat fn6742.pdf | perl -MMIME::Base64 -ne 'print encode_base64($_)'`
#coded="hello amplifier cat dog snake"
json="{\"file\": \"${coded}\"}"
echo "$json" > json.file
#curl -X PUT "172.17.0.3:9200/docs/doc/1" -d '{ "file": "hello amplifier cat dog snake" }'
#curl -X PUT "172.17.0.3:9200/docs/doc/1" -d '{
#  "file": "IkdvZCBTYXZlIHRoZSBRdWVlbiIgKGFsdGVybmF0aXZlbHkgIkdvZCBTYXZlIHRoZSBLaW5nIg=="
#}'
curl -X PUT "127.0.0.1:9200/docs/doc/4" -d @json.file
sleep 10

 curl -X GET "127.0.0.1:9200/docs/_search?pretty=true" -d '{
   "fields":[],
   "query" : {
     "match" : {
       "file.content" : "amplifier"
     }
   },
   "highlight" : {
     "fields" : {
       "file.content" : {}
     }
   }
 }'
