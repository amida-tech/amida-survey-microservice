# Dockerfile
FROM node:8.9.0

# Add package.json before rest of repo, for Docker caching purposes
# See http://ilikestuffblog.com/2014/01/06/
ADD package.json /app/
WORKDIR /app
RUN npm install --production

# If you use Bower, uncomment the following lines:
# RUN npm install -g bower
# ADD bower.json /app/
# RUN bower install --allow-root

ADD . /app

ENV PORT 9005
EXPOSE 9005
CMD node seed.js && node --harmony index.js
