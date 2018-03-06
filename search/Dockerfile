FROM golang

EXPOSE 5000
WORKDIR /go/src/app

RUN go get github.com/blevesearch/bleve/... github.com/gorilla/mux/...

COPY bleve-hosted /go/src/app/

RUN go build 

#CMD go generate && ./bleve-hosted
CMD ./bleve-hosted