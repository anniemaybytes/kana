# Satsuki

Satsuki is our implementation of an IRC bot for the AnimeBytes IRC server.

## Usage

Satsuki listens for following IRC events:

- `PRIVMSG Satsuki :enter <username> <key>`
- `INVITE`

Following commands are accessible:

- !user [username]
- !nana
- !dess
- !metanoia

Additionally:

- Will listen on every channel it joins and resolve `<title>` for links posted
- Will listen for raw ECHO commands and forward them to specified channels. Format is `channel1-channel2|%|hello world`
- Will listen for Gitea style webhook on `/git/{:key}`. Suppported events are:
  - push (maximum of 10 commits will be echo'ed in channel)
  - create
  - delete
- Will listen for Drone CI webhook on `/ci/{:key}`. Supported events are:
  - created
  - updated
    - success
    - killed
    - failure
    - error
- Sends `WHO` to `#animebytes` every 5 minutes and transmits list of users back to remote endpoint at `https://animebytes.tv/api/irc/notifier`

## Installation

Satsuki requires NodeJS version 12 or later.

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
ExecStart=/usr/bin/node /opt/kana/dist/index.js
RestartSec=30s
Restart=always
User=hubot

[Install]
WantedBy=default.target
```

Alternatively, you can also build/use a docker container instead:

```sh
docker build . -t kana
# Pass in any additional parameters you may need, such as env vars into the docker run command
docker run kana
```

## Configuration

Configuration is stored in `.env` file in form of environment variables and you should load it before running. Below is list of required variables and their descriptions:

- `IRC_SERVER` - IRC server to connect to
- `IRC_PORT` - IRC port to connect to
- `IRC_USE_SSL` - Set to 'true' if the irc server is using ssl
- `IRC_VERIFY_SSL` - Set to 'false' if you wish to ignore the validity of the ssl cert on the irc server
- `IRC_NICK` - Nickname to use when connecting to IRC server
- `IRC_REALNAME` - Realname to use when connecting to IRC server
- `IRC_USERNAME` - Username to use when connecting to IRC server
- `IRC_IGNORE_USERS` - List of user nicks to ignore messages from, delimited by `,`
- `GIT_CHANNEL` - Channel used to echo messages received by Git webhook
- `CHANNELS` - List of channels Satsuki will join
- `OPER_USERNAME` - Oper username
- `OPER_PASS` - Oper password
- `SITE_API_KEY` - API key to authenticate with site, used for sending back list of online users, fetching user stats via `!user` and `!dess`
- `GIT_WEBHOOK` - Secret key to authenticate Git webhook endpoint
- `HTTP_PORT` - Port on which Hubot will expose Express router, used by Git and CI webhook
- `ECHO_PORT` - Port on which Satsuki will listen for raw ECHO commands, there is no authentication here so use firewall
- `LOG_LEVEL` - One of the strings `trace`, `debug`, `info`, `warn`, or `error` to use as the log level
- `IGNORE_OPER_FAILURE` - Set to 'true' to ignore the requirement of a successful OPER command (for testing and development)
