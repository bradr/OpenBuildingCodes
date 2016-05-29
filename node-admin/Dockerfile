FROM ubuntu:14.04

ENV DEBIAN_FRONTEND noninteractive

EXPOSE 8080

ADD . /app
WORKDIR /app

RUN apt-get update && apt-get install -y \
  nodejs \
  npm \
  imagemagick \
  tesseract-ocr \
  pdftk \
  unpaper \
  exactimage

#RUN apt-get update
#RUN apt-get install -y nodejs
#RUN apt-get install -y npm
#RUN apt-get install -y imagemagick
#RUN apt-get install -y tesseract-ocr

RUN dpkg -i pdfsandwich_0.1.4_amd64.deb && apt-get -fy install

RUN ln -s /usr/bin/nodejs /usr/bin/node

RUN npm install
RUN npm install -g nodemon

CMD ["nodemon","adminserver.js"]
