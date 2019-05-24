# Changelog

## [Unreleased]

### Changed
- PG connection will now fail (and this service will abort) if `SURVEY_SERVICE_PG_SSL=true` but `SURVEY_SERVICE_PG_CA_CERT` is not set to a valid value.

### Added
- `npm` --> `yarn`
- `yarn test` command changed to _only_ run tests
  * `yarn jenkins` includes DB creation, migrations, etc.
- Multi-stage Dockerfile build using alpine base image

### Fixed
- Patch for CVE-2019-5021 in `Dockerfile`. `node:8.16.0-alpine` uses a patched version of `alpine`.


## [0.0.1] -- 2016-12-21
This is the initial release to mark first go-live.

- See README for all the functionality.
- Go-live uses this [seed script](./api/syncDecember15.js).
- Only the end point `/profiles [POST]` is used in go-live.
