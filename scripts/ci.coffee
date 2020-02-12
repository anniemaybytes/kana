url = require 'url'
querystring = require 'querystring'

module.exports = (robot) ->
  gitChannel = process.env.GIT_CHANNEL

  if robot.adapter.constructor.name is 'IrcBot'
    bold = (text) ->
      "\x02" + text + "\x02"
    underline = (text) ->
      "\x1f" + text + "\x1f"
  else
    bold = (text) ->
      text
    underline = (text) ->
      text

  handler = (req, res) ->
    query = querystring.parse(url.parse(req.url).query)
    hook = req.body

    user = {}
    query.targets ||= []
    user.type = query.type if query.type

    message = false

    switch hook.event
      when "build"
        link = hook.system.link + "/" + hook.repo.slug + "/" + hook.build.number
        switch hook.action
          when "created"
            sender = hook.user.login
            if hook.build.trigger == "@cron"
              sender = "Cron system"

            message = []
            # coffeelint: disable=max_line_length
            message.push "CI: Build job \##{hook.build.number} by #{bold(sender)} for #{bold(hook.repo.slug)} created (#{underline(link)})"
            # coffeelint: enable=max_line_length

            if hook.build.before != "0000000000000000000000000000000000000000" &&
               hook.build.before != "" && hook.build.trigger != "@cron" && hook.build.link != ""
              message.push " Changes staged: #{underline(hook.build.link)}"

            message = message.join("\n")
          when "updated"
            switch hook.build.status
              when "success"
                # coffeelint: disable=max_line_length
                message = "CI: Build job \##{hook.build.number} for #{bold(hook.repo.slug)} completed succesfully (#{underline(link)})"
                # coffeelint: enable=max_line_length
              when "killed"
                # coffeelint: disable=max_line_length
                message = "CI: Build job \##{hook.build.number} for #{bold(hook.repo.slug)} was cancelled (#{underline(link)})"
                # coffeelint: enable=max_line_length
              when "failure"
                # coffeelint: disable=max_line_length
                message = "CI: Build job \##{hook.build.number} for #{bold(hook.repo.slug)} failed (#{underline(link)})"
                # coffeelint: enable=max_line_length
              when "error"
                # coffeelint: disable=max_line_length
                message = "CI: Build job \##{hook.build.number} for #{bold(hook.repo.slug)} errored (#{underline(link)})"
                # coffeelint: enable=max_line_length

    if message
      user.room = gitChannel
      robot.send user, message

  robot.router.post "/ci/" + process.env.GIT_WEBHOOK, (req, res) ->
    handler req, res
    res.end ""
