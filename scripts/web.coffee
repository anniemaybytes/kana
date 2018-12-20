{select: Select} = require "soupselect"
HtmlParser = require "htmlparser"
JSDom = require "jsdom"
HttpClient = require 'scoped-http-client'

module.exports = (robot) ->

  unEntity = (str) ->
    e = JSDom.jsdom().createElement("div")
    e.innerHTML = str
    if e.childNodes.length == 0 then "" else e.childNodes[0].nodeValue

  robot.hear /(http|ftp|https):\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-\.,@?^=%&amp;:/~\+#]*[\w\-\@?^=%&amp;/~\+#])?/i, (msg) ->
    httpResponse = (url) ->
      HttpClient.create(url)
      .header('User-Agent', "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.102 Safari/537.36")
      .header('Cookie', "PREF=f6=42008")
      .get(->) (err, res, body) ->
        if err || !res
          console.log "HTTP got error:", err
          msg.send "Error loading page"
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

    url = msg.match[0]

    if url.match(/https?:\/\/(.+\.)?animebyt(\.es|es\.tv)/i) || url.match(/127\.0\.0\.1/i)
      return
    else
      try
        httpResponse(url)
      catch RangeError
        return
