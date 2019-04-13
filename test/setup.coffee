{DEBUG} = process.env
if DEBUG? and DEBUG is 'true'
  process.env.HUBOT_IRC_DEBUG=true
else
  delete process.env.HUBOT_IRC_DEBUG

process.env.HUBOT_IRC_ROOMS="#mocha"
process.env.HUBOT_IRC_SERVER="localhost"
process.env.HUBOT_IRC_NICK="Hubot"
process.env.HUBOT_IRC_REALNAME="Hubot"
process.env.HUBOT_IRC_USERNAME="hubot"
process.env.HUBOT_IRC_IGNORE_USERS="someuser"
process.env.HUBOT_IRC_PORT=1337
process.env.GIT_CHANNEL="#mocha"
process.env.AB_CHANNELS="#mocha"
process.env.OPER_USERNAME="changeme"
process.env.OPER_PASS="changeme"
process.env.SITE_API_KEY="changeme"
process.env.GIT_WEBHOOK="changeme"
process.env.PORT=6667
process.env.ECHO_PORT=54321
