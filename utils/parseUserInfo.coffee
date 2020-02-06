class ParseUserInfoInvalidInput extends Error
  name: 'ParseUserInfoInvalidInput'
  constructor: (@message) ->
    undefined



class ParseUserInfoMissingUser extends Error
  name: 'ParseUserInfoMissingUser'
  constructor: (@message) ->
    undefined



class ParseUserInfoMissingRank extends Error
  name: 'ParseUserInfoMissingRank'
  constructor: (@message) ->
    undefined



class ParseUserInfoMissingHost extends Error
  name: 'ParseUserInfoMissingHost'
  constructor: (@message) ->
    undefined



class ParseUserInfoWrongHost extends Error
  name: 'ParseUserInfoWrongHost'
  constructor: (@message) ->
    undefined



module.exports.parseUserInfo = (host) ->
  if !host? or host.constructor isnt String
  then throw new ParseUserInfoInvalidInput()

  arr = host.split('.').filter Boolean

  if arr.length is 0 then throw new ParseUserInfoMissingUser()

  [user, rank, ab] = arr

  if !user? then throw new ParseUserInfoMissingUser()
  else if !rank? then throw new ParseUserInfoMissingRank()
  else if !ab? then throw new ParseUserInfoMissingHost()
  else if ab isnt 'AnimeBytes' then throw new ParseUserInfoWrongHost()

  {user, rank}

module.exports.ParseUserInfoInvalidInput = ParseUserInfoInvalidInput
module.exports.ParseUserInfoMissingUser = ParseUserInfoMissingUser
module.exports.ParseUserInfoMissingRank = ParseUserInfoMissingRank
module.exports.ParseUserInfoMissingHost = ParseUserInfoMissingHost
module.exports.ParseUserInfoWrongHost = ParseUserInfoWrongHost
