# Satsuki

Satsuki is our implementation of GitHub's [Hubot](http://hubot.github.com/).

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
- Will listen for Gitea/Gogs style webhook on `/git/{:key}/{:type}`. Suppported events are:
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

Satsuki requires NodeJS. Version 10 or 12 is recommended.

```
$ npm i
$ npm run hubot
```

Example systemd unit file:
```
Unit]
Description=kana
After=network.target

[Service]
EnvironmentFile=/opt/kana/.env
WorkingDirectory=/opt/kana
ExecStart=/usr/bin/npm run hubot
RestartSec=30s
Restart=always
User=hubot

[Install]
WantedBy=default.target
```

## Configuration

Configuration is stored in `.env` file in form of environment variables and you should load it before running. Below is list of required variables and their descriptions:

- `HUBOT_IRC_ROOMS` - List of channels Hubot will join on connect delimited by `,`
- `HUBOT_IRC_SERVER` - IRC server to connect to
- `HUBOT_IRC_NICK` - Nickname to use when connecting to IRC server
- `HUBOT_IRC_REALNAME` - Realname to use when connecting to IRC server
- `HUBOT_IRC_USERNAME` - Username to use when connecting to IRC server
- `HUBOT_IRC_IGNORE_USERS` - List of users to ignore messages from, delimited by `,`
- `HUBOT_IRC_PORT` - IRC port to connect to
- `GIT_CHANNEL` - Channel used to echo messages received by Git webhook
- `AB_CHANNELS` - List of channels Satsuki will SAJOIN itself onto after acquiring IRCop permissions, delimited by `,`
- `OPER_USERNAME` - Oper username
- `OPER_PASS` - Oper password
- `SITE_API_KEY` - API key to authenticate with site, used for sending back list of online users, fetching user stats via `!user` and `!dess`
- `GIT_WEBHOOK` - Secret key to authenticate Git webhook endpoint
- `PORT` - Port on which Hubot will expose Express router, used by Git and CI webhook
- `ECHO_PORT` - Port on which Satsuki will listen for raw ECHO commands, there is no authentication here so use firewall

Additionally, all possible variables from Hubot and Hubot IRC can be used.