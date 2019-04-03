net = require 'net'
util = require 'util'
{EventEmitter} = require 'events'

MockIrc = (port, encoding, isSecure) ->
  self = @
  connectionClass = net
  options = {}

  @port = port or (if isSecure then 6697 else 6667)
  @encoding = encoding or 'utf-8'
  @incoming = []
  @outgoing = []

  @server = connectionClass.createServer options, (c) ->
    c.on 'data', (data) ->
      msg = data.toString(self.encoding).split('\r\n').filter((m) -> m)
      self.incoming = self.incoming.concat msg

    self.on 'send', (data) ->
      self.outgoing.push data
      c.write data

    c.on 'end', ->
      self.emit 'end'

  @server.listen @port
  @

util.inherits MockIrc, EventEmitter

MockIrc.prototype.send = (data) ->
  @emit 'send', data

MockIrc.prototype.close = (cb) ->
  @server.close(cb)

module.exports = (port, encoding, isSecure) ->
  new MockIrc port, encoding, isSecure
