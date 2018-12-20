net = require 'net'

module.exports = (robot) ->
  splitString = (str) ->
    ret = []
    while str.length > 384
      ret.push(str.substr(0, 384))
      str = str.substr(384)
    ret.push str
    ret

  bbcode = (text) ->
    return '' unless text? and typeof text == 'string'
    text = text.replace(/\[url\](.*)\[\/url\]/gi, "$1")
    text = text.replace(/\[url=(.*)\](.*)\[\/url\]/gi, "$1 - $2")
    text.replace(/\[color=(.*)\](.*)\[\/color\]/gi, "$2")

  handler = (socket) ->
    socket.on 'data', (data) ->
      [channels, message] = data.toString().split('|%|')
      channels = channels.split('-')
      for channel in channels
        #for line in splitString(message)
        robot.adapter.send {room: "#" + channel}, bbcode(message)
      socket.end()

  robot.adapter.bot.addListener 'registered', ->
    net.createServer(handler).listen(process.env.ECHO_PORT)
