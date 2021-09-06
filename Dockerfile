FROM node:8.7.0-alpine

MAINTAINER jrodrigoviz@gmail.com

RUN mkdir -p /var/www/express
WORKDIR /var/www/express

COPY package.json /var/www/express
COPY package-lock.json /var/wwww/express

RUN npm install

COPY . /var/www/express

CMD ["npm","start"]



