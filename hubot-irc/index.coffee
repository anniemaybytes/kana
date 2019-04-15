IrcBot = require './src/irc'

module.exports.IrcBot = IrcBot

module.exports.use = (robot) ->
  if process.env.NODE_ENV is 'test'
    MockIrcBot = require '../test/mock/IrcBot'
    new MockIrcBot(robot)
  else
    new IrcBot robot
