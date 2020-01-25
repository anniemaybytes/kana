request = require 'request'
Log = require('log')

{
  parseUserInfo
  ParseUserInfoWrongHost
} = require '../utils/parseUserInfo'

module.exports = (robot) ->
  robot.hear /^!dess$/i, (msg) ->
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

    request.post 'https://animebytes.tv/api/irc/dess_tax', form: form, (err, res, body) ->
      err = 'Failed to log in' if !err && res.statusCode == 303

      if err
        if (process.env.HUBOT_IRC_DEBUG or false)
          logger.error(err)
        msg.send 'Internal error'
        return

      body = JSON.parse(body)
      msg.send body.message
