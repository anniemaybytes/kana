request = require 'request'

unless process.env.SITE_API_KEY?
  throw new Error "Environment variable SITE_API_KEY must be set"

module.exports = (robot) ->
  users = {}

  recordStats = (onlineUsers) ->
    time = +new Date()
    newUsers = {}
    deltas = {}

    for own user of onlineUsers
      deltas[user] = if users[user]?
        delta_time: Math.floor((time - users[user]) / 1000)
      else
        delta_time: 0
      newUsers[user] = time

    req = stats: JSON.stringify(deltas), authKey: process.env.SITE_API_KEY
    request {method: 'POST', url: 'https://animebytes.tv/api/irc/notifier', form: req}, (err, res, body) ->
      if err
        console.log 'Error saving stats:', err.toString()
      else if res.statusCode != 200
        console.log 'Non-OK response saving stats: HTTP', res.statusCode

    users = newUsers

  updateStats = ->
    onlineUsers = {}
    rawHandler = (message) ->
      return if message.args[0] != 'Satsuki' or message.args[1] != '#animebytes'

      if message.command == 'rpl_whoreply'
        id = message.args[2]
        host = message.args[3].split('.')
        return if host.length != 3 or host[2] != 'AnimeBytes'

        onlineUsers[id] = true
      else if message.command == 'rpl_endofwho'
        robot.adapter.bot.removeListener "raw", rawHandler
        recordStats(onlineUsers)
        setTimeout(updateStats, 300000)

    robot.adapter.bot.addListener "raw", rawHandler
    robot.adapter.command 'WHO', '#animebytes'

  robot.adapter.bot.addListener 'registered', ->
    updateStats()
