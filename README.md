# kana

kana is our implementation of an IRC bot for the AnimeBytes IRC server.

## Usage

kana listens for following IRC events:

- `PRIVMSG {:nick} :enter <channels> <username> <key>`
- `PRIVMSG {:nick} :identify <username> <key>`
- `INVITE`

Following commands are accessible:

- !user [username]

Additionally:

- Will listen on every channel it joins and resolve `<title>` for links posted
- Will listen for raw ECHO commands and forward them to specified channels
- Will listen for Gitea style webhook on `/webhook/gitea`. Suppported events are:
  - `push` (maximum of 10 commits will be echo'ed in channel)
  - `create`
  - `delete`
- Will listen for Drone CI webhook on `/webhook/drone`. Supported events are:
  - `created`
  - `updated`
    - `success`
    - `killed`
    - `failure`
    - `error`
- Sends `WHO` to `#animebytes` every 5 minutes and transmits list of users back to remote endpoint at `/api/irc/notifier`

## Installation

kana requires NodeJS version 16.13 or later and [Yarn package manager](https://classic.yarnpkg.com/)

```sh
yarn && yarn build
node dist/index.js
```

Example systemd unit file:

```systemd
[Unit]
Description=kana
After=network.target

[Service]
EnvironmentFile=/opt/kana/.env
WorkingDirectory=/opt/kana
ExecStart=/usr/bin/node dist/index.js
RestartSec=30s
Restart=always
User=kana

[Install]
WantedBy=default.target
```

Alternatively, you can also build/use a docker container instead:

```sh
docker build . -t kana
docker run -d --restart=always --env-file=.env --user 1001:1001 -v ${PWD}/channels.json:/app/channels.json kana
```

## Configuration

Configuration is done using environment variables:

- `IRC_SERVER` - IRC server to connect to
- `IRC_PORT` - IRC port to connect to
- `IRC_USE_SSL` - Set to 'true' if the irc server is using ssl
- `IRC_VERIFY_SSL` - Set to 'false' if you wish to ignore the validity of the SSL certificate on the IRC server
- `IRC_NICK` - Nickname to use when connecting to IRC server
- `IRC_REALNAME` - Realname to use when connecting to IRC server
- `IRC_USERNAME` - Username to use when connecting to IRC server
- `IRC_IGNORE_USERS` - List of user nicks to ignore messages from, delimited by `,`
- `OPER_USERNAME` - Oper username
- `OPER_PASS` - Oper password
- `IGNORE_OPER_FAILURE` - Set to 'true' to ignore the requirement of a successful OPER command (for testing and development)
- `SITE_API_KEY` - API key to authenticate with site, used for sending back list of online users, fetching user stats via `!user` and `!dess`
- `HTTP_BIND` - Hostname on which bot will expose Express router, used by Gitea and DroneCI webhook
- `HTTP_PORT` - Port on which bot will expose Express router, used by Gitea and DroneCI webhook
- `GIT_WEBHOOK` - Secret key to authenticate Gitea and DroneCI webhook endpoint
- `GIT_CHANNEL` - Channel used to echo messages received by Gitea webhook
- `ECHO_BIND` - Hostname on which bot will listen for raw ECHO commands
- `ECHO_PORT` - Port on which bot will listen for raw ECHO commands
- `ECHO_AUTH_KEY` - Secret key to authenticate Echo requests
- `LOG_LEVEL` - One of the strings `trace`, `debug`, `info`, `warn`, or `error` to use as the log level

Additionally, `channels.json` file is used by bot to dynamically store list of channels it knows about:

```json
{
  "$id": "channels.schema.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",

  "type": "object",
  "additionalProperties": {
    "type": "object",
    "properties": {
      "join": {
        "description": "What command should bot use to join channel; setting auto (default) will try JOIN followed by SAJOIN",
        "type": "string",
        "enum": ["auto", "join", "sajoin"]
      },
      "persist": {
        "description": "Mark channel as persistent; bot wil retry this channel on failure instead of removing it from list",
        "type": "boolean"
      }
    }
  }
}
```

You can pre-populate that file with list of channels that you want bot to always be on by creating new entry and 
setting its `persistent` property to `true`.
