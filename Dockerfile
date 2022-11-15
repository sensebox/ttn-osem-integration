# --------------> The build image
FROM node:19.1.0-alpine as build

RUN apk --no-cache --virtual .build add build-base python2 git

WORKDIR /usr/src/app

# copy in main package.json and yarn.lock
COPY package.json /usr/src/app/
COPY yarn.lock /usr/src/app/

RUN yarn install --pure-lockfile --production

COPY . /usr/src/app

# --------------> The production image
FROM node:19.1.0-alpine

WORKDIR /usr/src/app
COPY --from=build /usr/src/app /usr/src/app

CMD [ "yarn", "start" ]
