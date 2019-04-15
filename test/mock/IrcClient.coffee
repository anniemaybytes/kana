Irc = require 'irc'

class MockIrcClient extends Irc.Client
  constructor: ->
    super

  say: (target, text) ->
    @emit 'say', target, text
    super

  send: (command) ->
    @emit 'send', command
    super

  notice: (target, text) ->
    @emit 'notice', target, text
    super

module.exports = MockIrcClient
