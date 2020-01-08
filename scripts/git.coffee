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
      when "push"
        if hook.commits.length > 0
          message = []
          branch = hook.ref.split("/")[2..].join("/")
          message.push "#{bold(hook.sender.login)} pushed #{bold(hook.commits.length)} commits to #{bold(branch)} on #{bold(hook.repository.name)}: "
          for i, commit of hook.commits
            break unless i < 10
            commit_message = commit.message.split("\n")[0]
            message.push " * #{commit.author.name}: #{commit_message} (#{underline(trim_commit_url(commit.url))})"
          if hook.commits.length > 1
            message.push "Entire diff: #{underline(hook.compare_url)}"
          message = message.join("\n")
      when "create"
        message = "#{bold(hook.sender.login)} created new #{hook.ref_type} #{bold(hook.ref)} on #{bold(hook.repository.name)}"
      when "pull"
        message = "#{bold(hook.sender.login)} #{hook.action} \##{bold(hook.number)} on #{bold(hook.repository.name)} (#{underline(hook.pull_request.html_url)})"
      when "issue"
        link = hook.repository.html_url + "/issues/" + hook.number
        message = "#{bold(hook.sender.login)} #{hook.action} \##{bold(hook.number)} on #{bold(hook.repository.name)} (#{underline(link)})"
      when "release"
        message = "#{bold(hook.sender.login)} #{hook.action} tag #{bold(hook.release.tag_name)} on #{bold(hook.repository.name)}"
      when "delete"
        message = "#{bold(hook.sender.login)} deleted #{hook.ref_type} #{bold(hook.ref)} on #{bold(hook.repository.name)}"  

    user.room = gitChannel
    robot.send user, message

  robot.router.post "/git/" + process.env.GIT_WEBHOOK + "/:type", (req, res) ->
    handler req.params.type, req, res
    res.end ""