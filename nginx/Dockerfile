FROM nginx

EXPOSE 81

RUN rm /etc/nginx/conf.d/default.conf
ADD openBC.conf /etc/nginx/conf.d/

CMD ["nginx", "-g", "daemon off;"]
