Irc = require 'irc'

class MockIrcClient extends Irc.Client
  constructor: (server, nick, opt) ->
    super server, nick, opt

  say: (target, text) ->
    @emit 'say', target, text
    super target, text

  send: (command) ->
    @emit 'send', command
    super arguments...

  notice: (target, text) ->
    @emit 'notice', target, text
    super target, text



module.exports = MockIrcClient
