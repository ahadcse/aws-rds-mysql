--liquibase formatted sql

CREATE TABLE IF NOT EXISTS TABLE1
(
  id                    SERIAL PRIMARY KEY    NOT NULL,
  ATTR1                 VARCHAR(20)           NOT NULL,
  ATTR2                 VARCHAR(20)           NOT NULL
);
