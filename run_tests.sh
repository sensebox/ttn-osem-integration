#!/bin/bash

export OSEM_dbconnectionstring=mongodb://localhost/ttn-osem-tests
container=mongo-ttn-osem

function cleanup {
  kill -2 $node_pid
  docker stop "$container"
}

docker run -d -p 27017:27017 --name "$container" mongo || docker start "$container"

npm start &
node_pid=$!

trap cleanup EXIT 

npm run test -s

