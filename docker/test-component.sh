#!/usr/bin/env bash
set -e
echo " ### Initializing test mysql container"

MYSQL_ROOT_USER=root
MYSQL_ROOT_PASSWORD=root_password

DATABASE=lists
SCHEMA_FOLDER="$PWD/src/setupDB/src/main/resources/lbase/scripts"

if [[ "$OSTYPE" == "linux-gnu" ]]; then
    # LINUX
    DOCKER_HOST=$(ip -4 addr show docker0 | grep -Po 'inet \K[\d.]+') ;
elif [[ "$OSTYPE" == "darwin"* ]]; then
    # MACOS
    DOCKER_HOST=host.docker.internal ;
elif [[ "$OSTYPE" == "linux-musl" ]]; then
    # BITBUCKET
    DOCKER_HOST=$(getent hosts ${1:-$HOSTNAME} | awk '{print $1}') ;
else
    echo 'Unknown os'
    exit 1
fi

echo "DOCKER_HOST set to $DOCKER_HOST"

docker run \
  --rm \
  --name lists-mysql \
  -e MYSQL_ROOT_PASSWORD=$MYSQL_ROOT_PASSWORD \
  -e MYSQL_DATABASE=$DATABASE \
  -p 3306:3306 \
  -p 33060:33060 \
  -d \
  mysql:5.6

echo " ### Creating liquibase container"

docker build -t liquibase docker

echo " ### Waiting for MySQL to start"

# TODO replace with loop that pings server until it responds or gives up
sleep 10

echo " ### Running liquibase job"

docker run \
  --rm \
  -e USER=$MYSQL_ROOT_USER \
  -e PASSWORD=$MYSQL_ROOT_PASSWORD \
  -e DATABASE=$DATABASE \
  -e DOCKER_HOST=$DOCKER_HOST \
  -v $SCHEMA_FOLDER:/scripts \
  liquibase
