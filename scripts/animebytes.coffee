request = require 'request'
Log = require('log')

{
  parseUserInfo
  ParseUserInfoWrongHost
} = require '../utils/parseUserInfo'

logger = new Log process.env.HUBOT_LOG_LEVEL or 'info'

unless process.env.SITE_API_KEY?
  throw new Error "Environment variable SITE_API_KEY must be set"

module.exports = (robot) ->
  robot.adapter.bot.addListener 'registered', ->
    robot.adapter.command 'OPER', process.env.OPER_USERNAME, process.env.OPER_PASS
    robot.adapter.command 'CHGIDENT', process.env.HUBOT_IRC_NICK, 'Satsuki'
    robot.adapter.command 'MODE', process.env.HUBOT_IRC_NICK, '+B'
    robot.adapter.command 'CHGHOST', process.env.HUBOT_IRC_NICK, 'bakus.dungeon'
    for channel in process.env.AB_CHANNELS.split ','
      robot.adapter.command 'SAJOIN', process.env.HUBOT_IRC_NICK, channel

  robot.hear /[^\s]+(?:\s)+enter(?:\s)+([^\s]+)(?:\s)+([^\s]+)(?:\s)+([^\s]+)/i, (msg) ->
    return if msg.message.room?

    [rooms, userName, key] = msg.match[1..3]
    reply_to = msg.message.user.name

    msg.command = msg.robot.adapter.command.bind msg.robot.adapter

    rooms = (r.trim().toLowerCase() for r in rooms.split ',')

    form = {
      authKey: process.env.SITE_API_KEY,
      request: JSON.stringify({
        username: userName,
        key: key,
        channels: rooms
      })
    }

    request.post 'https://animebytes.tv/api/irc/auth_user', form: form, (err, res, body) ->
      err = 'Failed to log in' if !err && res.statusCode == 303

      if err
        if (process.env.HUBOT_IRC_DEBUG or false)
          logger.error err
        msg.send 'Internal error'
        return

      body = JSON.parse(body)
      if !body.success
        msg.send body.error
        return

      msg.command 'CHGIDENT', reply_to, body.id.toString()
      msg.command 'CHGHOST', reply_to, body.host

      for room, allowed of body.channels
        if allowed
          msg.command 'SAJOIN', reply_to, room
        else
          msg.send 'Access denied for ' + room

  robot.hear /^!user(?: (.+))?/i, (msg) ->
    try
      name = parseUserInfo(msg.message.user.original.host).user
    catch err
      if err instanceof ParseUserInfoWrongHost
        return msg.send 'Not authorized'

    if msg.match[1]
      name = msg.match[1]

    return unless name

    form = {
      authKey: process.env.SITE_API_KEY,
      username: name
    }

    request.post 'https://animebytes.tv/api/irc/user_info', form: form, (err, res, body) ->
      err = 'Failed to log in' if !err && res.statusCode == 303

      if err
        if (process.env.HUBOT_IRC_DEBUG or false)
          logger.error err
        msg.send 'Internal error'
        return

      body = JSON.parse(body)
      msg.send body.message
