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
            message = []
            message.push "CI: Build \##{hook.build.number} by #{bold(hook.user.login)} for #{bold(hook.repo.slug)} created (#{underline(link)})"
            message.push "Changes staged: #{underline(hook.build.link)}"
            message = message.join("\n")
          when "updated"
            switch hook.build.status
              when "success"
                message = "CI: Build \##{hook.build.number} for #{bold(hook.repo.slug)} completed succesfully (#{underline(link)})"
              when "killed"
                message = "CI: Build \##{hook.build.number} for #{bold(hook.repo.slug)} was cancelled by user (#{underline(link)})"
              when "failure"
                message = "CI: Build \##{hook.build.number} for #{bold(hook.repo.slug)} failed (#{underline(link)})"
              when "error"
                message = "CI: Build \##{hook.build.number} for #{bold(hook.repo.slug)} errored (#{underline(link)})"
              when "skipped"
                message = "CI: Build \##{hook.build.number} for #{bold(hook.repo.slug)} skipped (#{underline(link)})"
              when "blocked"
                message = "CI: Build \##{hook.build.number} for #{bold(hook.repo.slug)} blocked (#{underline(link)})"
              when "declined"
                message = "CI: Build \##{hook.build.number} for #{bold(hook.repo.slug)} declined (#{underline(link)})"

    if message
      user.room = gitChannel
      robot.send user, message

  robot.router.post "/ci/" + process.env.GIT_WEBHOOK, (req, res) ->
    handler req, res
    res.end ""
