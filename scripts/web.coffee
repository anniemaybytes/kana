{select: Select} = require "soupselect"
HtmlParser = require "htmlparser"
JSDom = require "jsdom"
HttpClient = require 'request'

module.exports = (robot) ->

  unEntity = (str) ->
    e = new JSDom.JSDOM().window.document.createElement("div")
    e.innerHTML = str
    if e.childNodes.length == 0 then "" else e.childNodes[0].nodeValue

  robot.hear /(http|ftp|https):\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-\.,@?^=%&amp;:/~\+#]*[\w\-\@?^=%&amp;/~\+#])?/i, (msg) ->
    httpResponse = (url) ->
      size = 0
      options = {
        uri: url,
        encoding: null,
        headers: {
          "User-Agent": "Satsuki/1.0 (Hubot) Web/1.1",
          "Accept-Language": "en-US,en;q=0.7",
          "Cookie": "PREF=f6=42008"
        },
        jar: false
      }
      HttpClient options, (err, res, body) ->
        if err || !res
          console.log "HTTP got error:", err
        else if res.statusCode in [301, 302, 303]
          httpResponse(res.headers.location)
        else if res.statusCode is 200
          if res.headers['content-type']?.indexOf('text/html') != 0
            return

          handler = new HtmlParser.DefaultHandler()
          parser  = new HtmlParser.Parser handler
          parser.parseComplete body

          # abort if soupselect runs out of stack space
          try
            results = Select(handler.dom, "head title")
          catch RangeError
            return

          processResult = (elem) ->
            if data = elem?.children?[0].data
              title = unEntity(data).replace(/(\r\n|\n|\r)/gm,"").replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, '').trim()
              return unless title

              if title.length > 100
                for i in [100..0]
                  break if title[i].match /\s/
                i = 50 if i == -1
                title = title.substr(0, i) + "..."

              msg.send "Link title: #{title}"

          if results[0]
            processResult(results[0])
          else
            results = Select(handler.dom, "title")
            processResult(results[0])
        else
          msg.send "Error " + res.statusCode
      .on 'data', (chunk) ->
        size += chunk.length
        if size > 1000000
          this.abort()

    url = msg.match[0]

    if url.match(/https?:\/\/(.+\.)?animebyt(\.es|es\.tv)/i) || url.match(/127\.0\.0\.1/i) || url.match(/\.(png|jpg|jpeg|gif|txt|zip|tar\.bz|js|css|pdf)/)
      return
    else
      try
        httpResponse(url)
      catch RangeError
        return
