# node image
FROM node:8.10.0

# set /app directory as default working directory
WORKDIR /app
COPY . /app/

# Run yarn
RUN yarn install --pure-lockfile

# expose port 9005
EXPOSE 9005

CMD node seed.js && yarn start
