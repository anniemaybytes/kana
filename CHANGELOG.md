# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

## v2.7.1
### Fixed
- Work around `got` redirection mechanism
(https://github.com/sindresorhus/got/issues/1271 https://github.com/sindresorhus/got/issues/1307)

## v2.7.0
### Changed
- Switched from `node-fetch` to `got`

## v2.6.1
### Fixed
- Work around `node-fetch` issues to avoid leaking memory on aborted link fetching

## v2.6.0
### Changed
- Ignore more binary extensions from link title resolving
- Use Twitterbot-like User-Agent for link title resolving (`kana/2.0 (node-fetch) like Twitterbot/1.0`)

## v2.5.0
### Added
- Trim commit SHA1 hash in compare URLs from webhooks
- Space usernames and git branch from webhooks with `\u200B` to avoid 
higlighting users on IRC
- Automatically rejoin persistent channels on IRC
- Remove non-persistent channel from configuration when bot parts from it

### Changed
- Do not set default key for GIT_WEBHOOK on runtime, only for tests
- Do not set default key for SITE_API_KEY on runtime
- Default bot name to `kana` instead of `testbot`
- Always return JSON object as reply to webhook

## v2.4.0
### Added
- Add prefix with date and level to log messages
- Use `chalk` to color logs when possible
- Split logger between modules

### Fixed
- Create `channels.json` if it does not exist
- Handle and log errors in `performDess`
- Do not start if `channels.json` is malformed to avoid overwriting it later

### Changed
- Less verbose logging for stats collection
- Better logging of connection message

## v2.3.0
### Added
- Allow to search via IRC nick exclusively by prefixing it with `@` in `!user`

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
