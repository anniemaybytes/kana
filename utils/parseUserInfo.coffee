module.exports = parseUserInfo = (host) ->
  arr = host.split('.')
  [user, rank, ab] = arr
  if arr.length != 3 or ab != 'AnimeBytes'
    user = rank = ''
  {user, rank}
