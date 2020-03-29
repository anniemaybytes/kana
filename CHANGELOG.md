# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

## v2.3.0
### Added
- Allow to search via IRC nick exclusively by appending it with `@` in `!user`

## v2.2.2
### Fixed
- Only fetch title for unique links
- Only fetch link title for messages with maximum of 3 links in them

## v2.2.1
### Fixed
- Branch name fetching from inconsistent Gitea webhook events

## v2.2.0
### Added
- Parse and fetch titles for multiple links in messages

## v2.1.2
### Fixed
- Do not print whole response body on HTTP error
- Handle SIGTERM in addition to SIGINT

## v2.1.1
### Fixed
- Sanitize content from `<title>` in `parseTitle`

## v2.1.0
### Added
- Ability to use IRC nick for `!user`
- Build source map for easier debugging
- Persistent channels state on disk with `channels.json`
- SIGINT handler for shutting down bot
- Signature verification for webhooks

### Fixed
- Properly trim usernames for `!user`
- Handle newlines in `echo` listener

### Changed
- Better error handling

## v2.0.0
### Changed
- Initial TypeScript rewrite
