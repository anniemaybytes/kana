# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

## v5.3.0
### Changed
- Replace usage of deprecated substr with substring
- Remove unnecessary non-capturing groups in ENTER/IDENTIFY RegExp

## v5.2.0
### Fixed
- Validate URLs before attempting to fetch link title
### Changed
- Remove Alpine >= 3.13 restriction

## v5.1.0
### Changed
- Use specific User-Agent; link fetcher now uses 
`kana/2.0 (got [Link]) like Twitterbot/1.0` while `ABClient` uses `kana/2.0 (got [ABClient])`

## v5.0.0
### Changed
- Bumped minimum supported Node version to v16.13.0
- Bumped TypeScript target to ES2021

## v4.3.1
### Changed
- Force usage of Alpine 3.13 in Dockerfile

## v4.3.0
### Changed
- Simplify URL regex for matching links (this fixes some edge cases where link would be 
  only partially parsed)
- Remove `127.0.0.1` and `animebyt.es` from disallowed links

### Fixed
- Fixed broken test "Does not fetch or respond if there are more than 3 links in the message"
which would always pass due to typo

## v4.2.0
### Changed
- Print command on succesful execution of `IDENTIFY` command
- Customize error messages

## v4.1.0
### Added
- Special `IDENTIFY <username> <key>` command to set ident/host without joining any channel

## v4.0.1
### Fixed
- Support for TypeScript 4.1

## v4.0.0
### Removed
- `!dess`, `!nana` and `!metanoia`

## v3.0.0
### Changed
- Bumped minimum supported Node version to v14.15.0
- Bumped TypeScript target to ES2020

## v2.7.3
### Fixed
- Reverted `htmlparser2` to `4.1.0` to fix HTML entity decoding in `<title>`
(https://github.com/fb55/htmlparser2/issues/592)

## v2.7.2
No changes; updated dependencies

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
- Use Twitterbot-like User-Agent for link title resolving
(`kana/2.0 (node-fetch) like Twitterbot/1.0`)

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
