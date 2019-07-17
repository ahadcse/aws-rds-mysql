#!/usr/bin/env bash

ENVIRONMENT ?= dev
SERVICE ?= aws-rds-mysql
AWS_REGION ?= eu-west-1
SECURITY_GROUP ?= DBSecurityGroup

BUCKET_NAME = $(SERVICE)-bucket-$(ENVIRONMENT)
SWAGGER_PATH = s3://$(BUCKET_NAME)/$(SERVICE)/swagger.yaml

IAM_STACK_NAME = $(SERVICE)-iam

DB_NAME = 'listdb'

NOW = $(shell date)
REPOS = $(shell git config --get remote.origin.url)
REV = $(shell git rev-parse HEAD)

AWS_SSM_PUT_NAME = aws ssm put-parameter --region $(AWS_REGION) --name
AWS_SSM_PUT_SUFFIX = --value "0" --type SecureString --no-overwrite

.PHONY: deploy_iam
deploy_iam:
	@echo "\n------Deploying iam------\n"
	date

	$(eval API := $(shell aws apigateway get-rest-apis --query 'items[?name==`API Gateway Name in AWS`].id' --output text))

	aws cloudformation deploy \
	--template-file cloudformation/iam.yaml  \
	--stack-name $(IAM_STACK_NAME) \
	--capabilities CAPABILITY_NAMED_IAM  \
	--region $(AWS_REGION) \
	--tags Environment=$(ENVIRONMENT) \
	--parameter-overrides \
	Service=$(SERVICE) \
	Environment=$(ENVIRONMENT) \
	Api=$(API)

	date
	@echo "\n------Deploy iam DONE------\n"


.PHONY: deploy_persistent
deploy_persistent:
	@echo "\n----- Deploying persistent stack START -----\n"
	$(eval ROOT_USER := $(shell aws ssm get-parameters --names "/config/root_user" --with-decryption | jq .Parameters[0].Value))
	$(eval ROOT_PASS := $(shell aws ssm get-parameters --names "/config/root_password" --with-decryption | jq .Parameters[0].Value))
	aws cloudformation deploy \
	--no-fail-on-empty-changeset \
	--template-file cloudformation/persistent.yaml \
	--stack-name $(SERVICE)-persistent \
	--capabilities CAPABILITY_NAMED_IAM \
	--region $(AWS_REGION) \
	--tags Environment=$(ENVIRONMENT) Project=$(SERVICE) \
	--parameter-overrides \
		Environment=$(ENVIRONMENT) \
		Service=$(SERVICE) \
		DBName=$(DB_NAME) \
		RootUser=$(ROOT_USER) \
		RootPassword=$(ROOT_PASS)
		@echo "\n----- Deploying persistent stack DONE -----\n"

.PHONY: deploy_serverless
deploy_serverless:
	@echo "\n----- Deploying serverless stack -----\n"
	aws s3 cp cloudformation/swagger.yaml $(SWAGGER_PATH)
	$(call cfn-deploy,serverless)

cfn-deploy-s3 = aws cloudformation deploy \
	--no-fail-on-empty-changeset \
	--template-file cloudformation/s3.yaml \
	--stack-name $(SERVICE)-s3 \
	--region $(AWS_REGION) \
	--tags Environment=$(ENVIRONMENT) \
	--parameter-overrides \
		BucketName=$(BUCKET_NAME)

cfn-deploy = $(call cfn-package,${1}) && \
	$(eval API_ID := $(shell aws apigateway get-rest-apis --query 'items[?name==`$(SERVICE)`].id' --output text))  \
	$(eval ROOT_USER := $(shell aws ssm get-parameters --names "/config/root_user" --with-decryption | jq .Parameters[0].Value)) \
	aws cloudformation deploy \
	--tags Environment=$(ENVIRONMENT) Owner=beam Project=$(SERVICE) \
		"UpdatedDate=$(NOW)" \
	--template-file cloudformation/dist/${1}.yaml \
	--stack-name $(SERVICE)-${1} \
	--capabilities CAPABILITY_NAMED_IAM \
	--region $(AWS_REGION) \
	--no-fail-on-empty-changeset \
	--parameter-overrides \
		Service=$(SERVICE) \
		Environment=$(ENVIRONMENT) \
		ApiId=$(API_ID) \
		Swagger=$(SWAGGER_PATH) \
		Region=${AWS_REGION} \
		BucketName=$(BUCKET_NAME) \
		DBName=$(DB_NAME) \
		DBUsername=$(ROOT_USER)

cfn-package = mkdir -p cloudformation/dist && \
	aws cloudformation package \
	--template-file cloudformation/${1}.yaml \
	--output-template-file cloudformation/dist/${1}.yaml \
	--s3-bucket $(BUCKET_NAME) \
	--s3-prefix $(SERVICE)

deploy_ssm:
	@echo "\n----- Deploying SSM parameters -----\n"
	-${AWS_SSM_PUT_NAME} "/config/root_user" ${AWS_SSM_PUT_SUFFIX}
	-${AWS_SSM_PUT_NAME} "/config/root_password" ${AWS_SSM_PUT_SUFFIX}
	-${AWS_SSM_PUT_NAME} "/config/updater_password" ${AWS_SSM_PUT_SUFFIX}
	-${AWS_SSM_PUT_NAME} "/config/reader_password" ${AWS_SSM_PUT_SUFFIX}
	@echo "\n----- Deployment DONE -----\n"

install_npm_development:
	npm install
	for f in src/*; do \
		([ -d $$f ] && cd "$$f" && npm install) \
  done;

install_npm_production:
	npm prune --production
	for f in src/*; do \
		([ -d $$f ] && cd "$$f" && npm prune --production) \
  done;

remove_dist_modules:
	for folder in dist/src/*; do \
		if [[ -d $$folder/node_modules ]]; then \
			(rm -r $$folder/node_modules) \
		fi \
	done;

remove_src_modules:
	for folder in src/*; do \
		if [[ -d $$folder/node_modules ]]; then \
			(rm -r $$folder/node_modules) \
		fi \
	done;

copy_src_modules:
	for folder in src/*; do \
		if [[ -d $$folder/node_modules ]]; then \
			(cp -r $$folder/node_modules dist/$$folder/node_modules) \
		fi \
	done;

compile_typescript_watch:
	mkdir -p dist
	node node_modules/typescript/bin/tsc -w

compile_typescript:
	mkdir -p dist
	node node_modules/typescript/bin/tsc

lint_typescript:
	./node_modules/.bin/tslint '**/*.ts'

setup_component_tests:
	bash docker/test-component.sh

test:
	npx jest --silent --ci --coverage --runInBand

ci: install_development test lint_typescript

install_development: install_npm_development remove_dist_modules compile_typescript copy_src_modules

install_production: install_npm_development compile_typescript remove_dist_modules install_npm_production copy_src_modules

clean_node_modules: remove_dist_modules remove_src_modules
