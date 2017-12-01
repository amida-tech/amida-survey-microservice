# Survey Service API

Survey Service API

## Features

- [Node.js](https://nodejs.org/en/)
- [Express](https://expressjs.com/)
- [Postgres](https://www.postgresql.org/)
- [Sequelize](http://docs.sequelizejs.com/en/v3/)
- [Mocha + Chai + SuperTest](http://engineering.invisionapp.com/post/express-integration-testing-supertest/)
- [Grunt](https://gruntjs.com/)

## Installation

1. Install all dependencies:
	* Node.js v6 (previous node versions may require Babel)
	* Postgres (v9.5 or greater)
	> Note: Default installations of Postgres on macOS (such as through homebrew or DMG install) may not grant proper permission to your postgres user role. macOS users may need to alter their Postgres user role with [role attribute](https://www.postgresql.org/docs/9.5/static/role-attributes.html) `LOGIN`. See [ALTER ROLE – (postgres.org)](https://www.postgresql.org/docs/9.5/static/sql-alterrole.html) in the Postgres Documentation for more.

	> Note: Windows users may be required to install Python 2.7 and Visual C++ Build Tools. Please follow [Installing Python and Visual C++ Build Tools (Windows)](#installing-python-and-visual-c-build-tools-windows) prior to continuing installation.
2. Create database surveyService:
`createdb surveyService`
3. Install Grunt:
`npm install -g grunt`
4. Install npm dependencies:
`npm install`
5. Create a `.env` file in root.
> Note: See [Configuration](#Configuration) for more about configuring your `.env` file.
6. Populate your database:
`node seed.js`
7. Run:
`npm start`

### Installing Python and Visual C++ Build Tools (Windows)

Due to variances between Windows, Linux, and macOS, Windows users will have to add a few steps for
installing the needed components for node-gyp. And all users will probably have to install Python 2.7 as well.

1. Download & install Python 2.7.
2. Set the Environmental Variables for the Python install, including the variable 'PYTHON.'
3. Download & install [Visual C++ Build Tools](http://landinghub.visualstudio.com/visual-cpp-build-tools).
4. Run 'npm config set msvs_version 2015 --global'
5. If errors continue to occur, update to the latest version of npm with 'npm install npm -g'


## Configuration

Use `export NODE_ENV=development` (or `production` or `test`) to set node environment in Bash compatible shells or equivalent in others.

Add to `PATH` `export PATH=$PATH:/Applications/Postgres.app/Contents/Versions/latest/bin`. Note: You'll have to preform this operation for each new shell session, or add the Postgres `bin` file to your `$PATH` variable.

A minimal sample `.env` file is below.  Change according to your database
```
SURVEY_SERVICE_DB_NAME=surveyService
SURVEY_SERVICE_DB_USER=postgres
SURVEY_SERVICE_DB_PASS=postgres
SURVEY_SERVICE_DB_HOST=localhost
SURVEY_SERVICE_DB_PORT=5432
SURVEY_SERVICE_DB_DIALECT=postgres
SURVEY_SERVICE_DB_POOL_MAX=5
SURVEY_SERVICE_DB_POOL_MIN=0
SURVEY_SERVICE_DB_POOL_IDLE=10000
SURVEY_SERVICE_LOGGING_LEVEL=emerg
SURVEY_SERVICE_CLIENT_BASE_URL="http://localhost:4000/reset-tokens/"
SURVEY_SERVICE_CORS_ORIGIN=http://localhost:4000
SURVEY_SERVICE_ZIP_BASE_URL="http://www.zipcodeapi.com/rest/"
SURVEY_SERVICE_ZIP_API_KEY=xxx
SURVEY_SERVICE_ZIP_DISTANCE=50
SURVEY_SERVICE_ZIP_UNITS=mile
```

A list of full environment variable settings is below.  They can be either manually set in the shell or can be included in the `.env` file.  Defaults indicated in paranthesis.

- SURVEY_SERVICE_CLIENT_SECRET: Secret for JWT encryption ('this is a secret' for development and test).
- SURVEY_SERVICE_PORT: Port for the API server (9005).
- SURVEY_SERVICE_DB_NAME: Database name (surveyService for development and production, surveyServicetest for test).
- SURVEY_SERVICE_DB_USER: Database user (no default).
- SURVEY_SERVICE_DB_PASS: Database password (no default).
- SURVEY_SERVICE_DB_HOST: Database host ip (localhost).
- SURVEY_SERVICE_DB_PORT: Database host port (5432).
- SURVEY_SERVICE_DB_SCHEMA: Database schema in postgres sense.  This can be either a single schema name or '~' delimited string of multi tenant schema names.
- SURVEY_SERVICE_DB_DIALECT: Database dialect (postgres only, see [here](#postgredepend)).
- SURVEY_SERVICE_DB_POOL_MAX: Maximum number of connections in pool.
- SURVEY_SERVICE_DB_POOL_MIN: Minimum number of connections in pool.
- SURVEY_SERVICE_DB_POOL_IDLE: The maximum time, in milliseconds, that a connection can be idle before being released.
- SURVEY_SERVICE_DB_SSL: Use secure connections with SSL.
- SURVEY_SERVICE_SUPER_USER_USERNAME: Super user username (super).
- SURVEY_SERVICE_SUPER_USER_PASSWORD: Super user password (Am!d@2017PW).
- SURVEY_SERVICE_SUPER_USER_EMAIL: Super user email (rr_demo@amida.com).
- SURVEY_SERVICE_LOGGING_LEVEL: Logging level (info).
- SURVEY_SERVICE_CRYPT_HASHROUNDS: Number of rounds for hashing user passwords (10).
- SURVEY_SERVICE_CRYPT_RESET_TOKEN_LENGTH: Length for reset password token (20).
- SURVEY_SERVICE_CRYPT_RESET_PASSWORD_LENGTH: Length for temporary random password during reset (10).
- SURVEY_SERVICE_CRYPT_RESET_EXPIRES: Reset password expires value in seconds (3600).
- SURVEY_SERVICE_CLIENT_BASE_URL: Base client url for password reset (no default).
- SURVEY_SERVICE_CORS_ORIGIN: Client URIs that the API CORS setup will accept. Delimited by spaces for multiple URIs e.g. "http://localhost:4000 https://www.example.com"
- SURVEY_SERVICE_ZIP_BASE_URL: Base API URL for Zipwise zip code API. Set to `https://www.zipwise.com/webservices/radius.php`.
- SURVEY_SERVICE_ZIP_API_KEY: API key for Zipwise.

## Commands

`npm start`

> Run server (default port is 9005)

`grunt`

> First beautifies and lints all files and then runs all the tests.

`npm test`

> Runs all the tests.

`npm run-script coverage`

> Runs all the tests and displays coverage metrics.

## Multitenant Support

Multitenancy is supported through postgres schemas.  Multiple schemas are specified using SURVEY_SERVICE_DB_SCHEMA as a '~' delimited string of schema names.  This project assumes that each schema has the same table structure during database synchronization.  Schema names are appended to the base url for each API end point so that each tenant can be accessed using a different path.

## Tests

This project primarily uses [Mocha](http://mochajs.org/), [Chai](http://chaijs.com/) and [Super Test](https://github.com/visionmedia/supertest) for automated testing.  [Sinon](http://sinonjs.org/) is also used in a couple of tests when it is absolutely necessary to use stubs.  Stubbing in general however is avoided.

All tests are located in `test` directory in a mostly flat directory structure.  All API entries both get a HTTP integration test and an equivalent model test.  Unit tests for other utility modules are also included in the root directory.  In addition `test/use-cases` directory includes informative tests designed to instruct how to use the API from a client.

Individual test suites can be run using mocha. In order to run the tests, make sure you first run `createdb surveyServicetest`.

```
$ mocha test/survey.model.spec.js --bail
```

Each test in a file may depend on some of the previous tests so using flag `bail` is recommended.

Most API resources are documented in snippets in the [integration document](./docs/api.md).  A [top level script](./docs/scripts/run-all.js) that exercises snippets is also included.

## API

File [swagger.json](./swagger.json) describes the API.  There are various [swagger](http://swagger.io/) tools such as [swagger-codegen](https://github.com/swagger-api/swagger-codegen) that can be used view or generate reports based on this file.

When the survey-service api server is running `/docs` resource serves Swagger-UI as the API user interface (`localhost:9005/docs` for default settings).  However due to current limited support for JWT, Swagger-UI mostly works as documentation and resources that require authorization can not be run.

Detailed description of the API with working examples is provided in the [integration document](./docs/api.md).

## Database Design

### General

All table and column names are in snake case to follow Postgres convention and for ability to write Postgres queries easily.  All tables have `created_at` columns.  All tables for which records can be updated have an `updated_at` column.  All tables for which records can be soft deleted have a `deleted_at` column.  If there is a timestamp value at the `deleted_at` column, the record is soft deleted.  No record on any table is ever hard deleted.  If exists column `line` is used to order records for client presentation.

### Multi Lingual Support

This is a English first design where all logical records are assumed to be in English when first created.  Once a record is created any user facing text column (those users see in the user interface) can be translated to any language.  For each table English and translated versions of user facing text colums are stored in an axuilliary table whose name is the name of the actual table postfixed with `_text` (Ex: `question` and `question_text`).

### Tables

- `answer`: This table stores all the answers to questions.  Each record represents an answer to a question (column `question_id`) in a survey (column `survey_id`) by a user (column `user_id`).  Actual answer data can be a choice from question multiple choices (column `question_choice_id`), a free value field (column `value`) or a file (column `file_id`).

- `answer_identifier`: This table stores client specific (column `type`) identifiers (colum `identifier`) for possible answers to questions (columns `question_id`, `question_choice_id`, `multiple_index`).

- `answer_rule`: This table stores conditions (column `logic`) for survey (column `survey_id`) questions (column `question_id`) or sections (column `section_id`) to be enabled or disabled. Conditions are based on answers to other questions (column `answer_question_id`).  Conditon answers themselves are defined in table `answer_rule_value`.

- `answer_rule_logic`: This table defines possible condition types (column `name`, exs: equals, exists) that can be used in `answer_rule` table.

- `answer_rule_value`: This table stores answers (columns `question_choice_id` and `value`) that are used in rules (column `answer_rule_id`) in conditional questions.

- `answer_type`: This table stores available answer types. Current supported types are `text`, `bool` and `choice`.

- `assessment`: This table defines assesments (column `name`) together with table `assesment_survey`.  Assessment are set of surveys whose answers are tracked over time.

- `assessment_survey`: This table stores the surveys (column `survey_id`) that forms an assessment (column `assessment_id`).

- `choice_set`: This table defines a choice set (column `reference`) that can be used to for shared choices that can be used in questions.

- `file`: This table stores users' (column `user_id`) answers that are files (columns `name` and `content`).

- `filter`: This table stores quesion filters.

- `filter_answer`: This table stores filter specifics (columns `question_id`, `exclude`, `question_choice_id`, `value`) for filter (column `filter_id`).

- `language`: Each record in this table represents a supported language.  `code` column is used as the primary key and designed to store two or three character ISO codes.  Columns `name` and `native_name` can be used for language selection on the client.

- `question`: Each record in this table represents a question that is being or can be used in surveys .  Questions can be stand alone, can belong to a survey or can belong to multiple surveys.  Link to surveys (table `survey`) is achieved through `survey_question` table.  Question records can be soft deleted but when no other active record in any other table does not reference it.  Versioning is supported using columns `version` and `group_id`.  Version is a number and `group_id` is the `id` of the first question in the group.  A set of types are supported (column `type`).

- `question_choice`: Each record in this table represents a choice in multiple choice question of types choice, choiceref, choices or open choice.  Each record can belong to a specific question (column `question_id`) or to a choice set that can be shared by multiple questions (column `choice_set_id`).  To support composite questions that can have multiply selectable choices together with free text fields (ex: a list of check boxes with a free text other field), this table also stores type of choice (column `type`) with currently supported types of `bool` and `text`.  Actual text of choice is stored in `question_choice_text`.

- `question_choice_text`: This table stores translatable column `text` which stores question choice texts. `language` is also column and each record has a value for `text` in that language. `question_choice_id` column links each record to `question_choice` table.

- `question_identifier`: This table stores client specific (column `type`) identifiers (colum `identifier`) for questions (columns `question_id`).

- `question_text`: This table stores translatable logical question field `text` in the column with the same name.  `language` is also a column and each record has a value for `text` in that language.  `question_id` column links each record to `question` table.

- `question_type`: This table stores available question types.

- `section`: This stores sections that can be used in surveys to group questions.

- `section_text`: This table stores translatable logical section fields `text` and `description` in the column with the same name.  `language` is also a column and each record has a value for `text` in that language.  `ection_id` column links each record to `question` table.

- `smtp`: This table stores email service specifics that can be used for various services (column `type`) that require outgoing email such as password reset functionality. The subject and content of password reset emails are stored in `smtp_text`.

- `smtp_text`: This table stores translatable columns `content` and `subject` for outgoing email for various services (column `type`).

- `smtp_type`: This table defines types of services that require outgoing emails.

- `staging_bhr_gap`: This table is used during importing of data.

- `survey`: Each record in this table represents a survey.  Surveys can be deleted. Versioning is supported using columns `version` and `group_id`.  Version is a number and `group_id` is the `id` of the first survey in the group.  Questions in surveys are represented using another table `survey_question`.  Only actual data column is `meta` which is designed to store client settings.

- `survey_identifier`: This table stores client specific (column `type`) identifiers (colum `identifier`) for surveys (columns `survey_id`).

- `survey_question`: This table stores questions in particular surveys.  Each record represents a question (column `question_id`) in a survey (column `survey_id`).  Question order is preserved using field line (column `line`).  Questions can also be marked required (column `required`).

- `survey_section_question`: This table stores sections in particular surveys.  Each record represents a section (column `section_id`) in a survey (column `survey_id`).  Section can be under a question (column `parent_question_id`) or another section (column `section_id`).

- `survey_section_question`:   This table stores questions in survey sections. Each record represents a question (column `question_id`) in a section (column `surveys_section_id`).

- `survey_status`: This defines statuses during answering of surveys,

- `survey_text`: This table stores translatable columns `name` and `description`. `language` is also a column and each record has a value for `name` in that language. `survey_id` column links each record to `survey` table.


- `rr_section`: Each record in this tables represents a section in a survey. Content of sections are represented as local indices of questions in column `indices`.  The name of the section is stored in `section_text` table.

- `section_text`: This table stores translatable column `name` which stores section name. `language` is also a column and each record has a value for `name` in that language.  `section_id` column links each record to `rr_sectionnc` table.

- `survey_section`: This table links surveys (column `survey_id`) to sections (column `section_id`).  Order of sections preserved using column `line`.

- `user_assessment`: This stores an instance of an assessment (column `assessment_id`) for a paricular participant (column `user_id`).

- `user_assessment_answer`: This stores user answers (column `answer_id`) for a particular assessment (coilumn `user_assessment_id`).

- `user_audit`: This is an audit table for endpoints (column `endpoint`) that users (column `user_id`) accessed.

- `user_survey`: This table stores status of a survey for a participant.  The status can be `in-progress` or `completed`.

### Record Updates

Except account columns `email` and `password` in users table, none of the user facing columns ever overwrite a previous value and a history is always available.  There are a few overwriting columns such as `meta` in `survey` table.  These are mainly used for client level settings and do not contribute to any business logic.

## Migration

This project uses [sequelize-cli](https://github.com/sequelize/cli) for migrations.  The bootstrap model is located [here](./migration/models) and corresponds to the state of the database during first go-live.

All migrations can be run using[sequelize-cli](https://github.com/sequelize/cli) in migration directory
```bash
cd migration
sequelize
```

Migration uses the `.env` file in the root directory.  Each run creates/updates a file named `sequelize-meta.json` in the migration directory.  This file must be preserved in this directory to avoid running the same migrations again.

## References

- [Node.js](https://nodejs.org/en/)
- [Express.js](https://expressjs.com/)
- [Grunt](http://gruntjs.com/)
- [Sequelize](http://docs.sequelizejs.com/en/v3/)
- [Sequelize-Cli](https://github.com/sequelize/cli)
- [Postgres](https://www.postgresql.org/)
- [Sinon](http://sinonjs.org/)
- [Mocha](http://mochajs.org/)
- [Chai](http://chaijs.com/)
- [Supertest](https://github.com/visionmedia/supertest)
- [Babel](http://babeljs.io/)
- [Swagger](http://swagger.io/)

## Deployment

### Deployment to AWS with Packer and Terraform
You will need to install [pakcer](https://www.packer.io/) and [terraform](https://www.terraform.io/) installed on your local machine.
Be sure to have your postgres host running and replace the `pg_host` value in the command below with the postgres host address. The command in `1.` below will allow you to build the AMI with default settings. You may also need to include additional environment variables in `./deploy/roles/api/templates/env.service.j2` before build.
1. First validate the AMI with a command similar to ```packer validate \
    -var 'aws_access_key=my-aws-access-key' \
    -var 'aws_secret_key=my-aws-secret-key' \
    -var 'build_env=development' \
		-var 'logstash_host=logstash.amida.com' \
    -var 'service_name=amida_survey_microservice' \
    -var 'ami_name=api-survey-service-boilerplate' \
    -var 'node_env=development' \
    -var 'jwt_secret=my-0-jwt-8-secret' \
    -var 'pg_host=amid-survey-packer-test.czgzedfwgy7z.us-west-2.rds.amazonaws.com' \
    -var 'pg_db=amida_survey' \
    -var 'pg_user=amida_survey' \
    -var 'pg_passwd=amida_survey' template.json```
2. If the validation from `1.` above succeeds, build the image by running the same command but replacing `validate` with `build`
3. In the AWS console you can test the build before deployment. To do this, launch an EC2 instance with the built image and visit the health-check endpoint at <host_address>:4000/api/health-check. Be sure to launch the instance with security groups that allow http access on the app port (currently 4000) and access from Postgres port of the data base. You should see an "OK" response.
4. Enter `aws_access_key` and `aws_secret_key` values in the vars.tf file
5. run `terraform plan` to validate config
6. run `terraform apply` to deploy
7. To get SNS Alarm notifications be sure that you are subscribed to SNS topic arn:aws:sns:us-west-2:844297601570:ops_team_alerts and you have confirmed subscription

Further details can be found in the `deploy` directory.
