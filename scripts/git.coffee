url = require 'url'
querystring = require 'querystring'

module.exports = (robot) ->
  gitChannel = process.env.GIT_CHANNEL
  debug = process.env.GIT_DEBUG?

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

    if debug
      console.log('query', query)
      console.log('hook', hook)

    user = {}
    query.targets ||= []
    user.type = query.type if query.type

    switch type
      when "web"
        message = []
        branch = hook.ref.split("/")[2..].join("/")
        # if the ref before the commit is 00000, this is a new branch
        if /^0+$/.test(hook.before)
            message.push "#{bold(hook.sender.login)} pushed a new branch: #{bold(branch)} on #{bold(hook.repository.name)} (#{underline(hook.repository.html_url)})"
        else
            message.push "#{bold(hook.sender.login)} pushed #{bold(hook.commits.length)} commits to #{bold(branch)} on #{bold(hook.repository.name)}: "
            for i, commit of hook.commits
              break unless i < 10
              commit_message = commit.message.split("\n")[0]
              message.push " * #{commit.author.name}: #{commit_message} (#{underline(trim_commit_url(commit.url))})"
            if hook.commits.length > 1
                message.push "Entire diff: #{underline(hook.compare_url)}"
        message = message.join("\n")

        user.room = gitChannel
        robot.send user, message

  robot.router.post "/git/web/" + process.env.GIT_WEBHOOK, (req, res) ->
    handler "web", req, res
    res.end ""

