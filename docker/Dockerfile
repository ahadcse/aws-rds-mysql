FROM openjdk:8-jdk-alpine

RUN apk add --no-cache wget tar bash
RUN wget https://github.com/liquibase/liquibase/releases/download/liquibase-parent-3.6.3/liquibase-3.6.3-bin.tar.gz \
  && tar -xzf liquibase-3.6.3-bin.tar.gz
RUN wget -O mysql-connector-java-8.0.15.jar https://search.maven.org/remotecontent?filepath=mysql/mysql-connector-java/8.0.15/mysql-connector-java-8.0.15.jar

COPY liquibase/* /

ENV USER user
ENV PASSWORD password
ENV DATABASE lists
ENV DOCKER_HOST 127.0.0.1

ENTRYPOINT /bin/bash \
  /liquibase \
  --username=$USER \
  --password=$PASSWORD \
  --url=jdbc:mysql://$DOCKER_HOST:3306/lists?characterEncoding=utf8 \
  --defaultsFile=/liquibase.properties \
  --changeLogFile=/changelog.xml \
  update \
  -Duser.updater_password=updater_pass \
  -Duser.reader_password=reader_pass
