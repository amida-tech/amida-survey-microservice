# Dockerfile
FROM node:6.9.1

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

# set up dotenv
RUN echo "NODE_ENV=${NODE_ENV}\n" >> .env &&\
    echo "SURVEY_SERVICE_DB_NAME=${SURVEY_SERVICE_DB_NAME}\n" >> .env &&\
    echo "SURVEY_SERVICE_DB_PORT=${SURVEY_SERVICE_DB_PORT}\n" >> .env &&\
    echo "SURVEY_SERVICE_DB_HOST=${SURVEY_SERVICE_DB_HOST}\n" >> .env &&\
    echo "SURVEY_SERVICE_DB_USER=${SURVEY_SERVICE_DB_USERPG_USER}\n" >> .env &&\
    echo "SURVEY_SERVICE_DB_PASS=${SURVEY_SERVICE_DB_PASS}\n" >> .env &&\
    echo "SURVEY_SERVICE_DB_DIALECT=${SURVEY_SERVICE_DB_DIALECT}\n" >> .env &&\
    echo "SURVEY_SERVICE_DB_POOL_MAX=${SURVEY_SERVICE_DB_POOL_MAX}\n" >> .env &&\
    echo "SURVEY_SERVICE_DB_POOL_MIN=${SURVEY_SERVICE_DB_POOL_MIN}\n" >> .env &&\
    echo "SURVEY_SERVICE_DB_POOL_IDLE=${SURVEY_SERVICE_DB_POOL_IDLE}\n" >> .env\
    echo "SURVEY_SERVICE_LOGGING_LEVEL=${SURVEY_SERVICE_LOGGING_LEVEL}\n" >> .env\
    echo "SURVEY_SERVICE_CORS_ORIGIN=${SURVEY_SERVICE_CORS_ORIGIN}\n" >> .env\


# Run any additional build commands here...
# RUN grunt some:task

ENV PORT 9005
EXPOSE 9005
CMD [ "node", "--harmony", "index.js" ]
