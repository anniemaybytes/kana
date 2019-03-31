IrcBot = require './src/irc'

module.exports.IrcBot = IrcBot

module.exports.use = (robot) ->
  new IrcBot robot
