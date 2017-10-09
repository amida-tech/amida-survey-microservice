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
    echo "RECREG_DB_NAME=${RECREG_DB_NAME}\n" >> .env &&\
    echo "RECREG_DB_PORT=${RECREG_DB_PORT}\n" >> .env &&\
    echo "RECREG_DB_HOST=${RECREG_DB_HOST}\n" >> .env &&\
    echo "RECREG_DB_USER=${RECREG_DB_USERPG_USER}\n" >> .env &&\
    echo "RECREG_DB_PASS=${RECREG_DB_PASS}\n" >> .env &&\
    echo "RECREG_DB_DIALECT=${RECREG_DB_DIALECT}\n" >> .env &&\
    echo "RECREG_DB_POOL_MAX=${RECREG_DB_POOL_MAX}\n" >> .env &&\
    echo "RECREG_DB_POOL_MIN=${RECREG_DB_POOL_MIN}\n" >> .env &&\
    echo "RECREG_DB_POOL_IDLE=${RECREG_DB_POOL_IDLE}\n" >> .env\
    echo "RECREG_LOGGING_LEVEL=${RECREG_LOGGING_LEVEL}\n" >> .env\
    echo "RECREG_CORS_ORIGIN=${RECREG_CORS_ORIGIN}\n" >> .env\


# Run any additional build commands here...
# RUN grunt some:task

ENV PORT 9005
EXPOSE 9005
CMD [ "node", "--harmony", "index.js" ]