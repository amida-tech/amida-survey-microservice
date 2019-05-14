# node image
FROM node:8.16.0-alpine as builder

# set /app directory as default working directory
WORKDIR /app/
COPY . /app/

# Run yarn
RUN yarn install --pure-lockfile

FROM node:8.16.0-alpine

WORKDIR /app/

COPY --from=builder /app/ /app/

# expose port 9005
EXPOSE 9005

CMD ["yarn", "serve"]
