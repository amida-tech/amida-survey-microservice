# Changelog

## [Unreleased]
### Added
- `npm` --> `yarn`
- `yarn test` command changed to _only_ run tests
  * `yarn jenkins` includes DB creation, migrations, etc.
- Multi-stage Dockerfile build using alpine base image


## [v0.0.1] -- 2016-12-21
This is the initial release to mark first go-live.

- See README for all the functionality.
- Go-live uses this [seed script](./api/syncDecember15.js).
- Only the end point `/profiles [POST]` is used in go-live.
