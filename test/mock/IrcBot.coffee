IrcBot = require '../../hubot-irc/src/irc'

class MockIrcBot extends IrcBot
  send: (envelope, strings...) ->
    @emit 'send', envelope, strings
    super envelope, strings



module.exports = MockIrcBot
