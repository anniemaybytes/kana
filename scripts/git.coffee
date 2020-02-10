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

  trim_commit_url = (url) ->
    url.replace(/(\/[0-9a-f]{9})[0-9a-f]+$/, '$1')

  handler = (type, req, res) ->
    query = querystring.parse(url.parse(req.url).query)
    hook = req.body

    user = {}
    query.targets ||= []
    user.type = query.type if query.type

    switch type
      when "push", "create", "delete"
        if hook.ref.indexOf('refs/heads/') != -1 || hook.ref.indexOf('refs/tags/') != -1
          branch = hook.ref.split("/")[2..].join("/")
        else
          branch = hook.ref
      else
        branch = "unknown"

    switch type
      when "push"
        if hook.commits.length > 0
          message = []

          # coffeelint: disable=max_line_length
          message.push "#{bold(hook.sender.login)} pushed #{bold(hook.commits.length)} commits to #{bold(branch)} on #{bold(hook.repository.name)}: "
          # coffeelint: enable=max_line_length
          
          for i, commit of hook.commits
            break unless i < 10
            commit_message = commit.message.split("\n")[0]
            message.push " * #{commit.author.name}: #{commit_message} (#{underline(trim_commit_url(commit.url))})"
          
          if hook.commits.length > 1
            message.push "Entire diff: #{underline(hook.compare_url)}"
          
          message = message.join("\n")
      when "create"
        # coffeelint: disable=max_line_length
        message = "#{bold(hook.sender.login)} created new #{hook.ref_type} #{bold(branch)} on #{bold(hook.repository.name)}"
        # coffeelint: enable=max_line_length
      when "pull"
        # coffeelint: disable=max_line_length
        message = "#{bold(hook.sender.login)} #{hook.action} \##{bold(hook.number)} on #{bold(hook.repository.name)} (#{underline(hook.pull_request.html_url)})"
        # coffeelint: enable=max_line_length
      when "issue"
        link = hook.repository.html_url + "/issues/" + hook.number
        # coffeelint: disable=max_line_length
        message = "#{bold(hook.sender.login)} #{hook.action} \##{bold(hook.number)} on #{bold(hook.repository.name)} (#{underline(link)})"
        # coffeelint: enable=max_line_length
      when "release"
        # coffeelint: disable=max_line_length
        message = "#{bold(hook.sender.login)} #{hook.action} tag #{bold(hook.release.tag_name)} on #{bold(hook.repository.name)}"
        # coffeelint: enable=max_line_length
      when "delete"
        # coffeelint: disable=max_line_length
        message = "#{bold(hook.sender.login)} deleted #{hook.ref_type} #{bold(branch)} on #{bold(hook.repository.name)}"
        # coffeelint: enable=max_line_length

    user.room = gitChannel
    robot.send user, message

  robot.router.post "/git/" + process.env.GIT_WEBHOOK + "/:type", (req, res) ->
    handler req.params.type, req, res
    res.end ""
