{expect} = require 'chai'

{
  parseUserInfo
  ParseUserInfoInvalidInput
  ParseUserInfoMissingUser
  ParseUserInfoMissingRank
  ParseUserInfoMissingHost
  ParseUserInfoWrongHost
} = require '../utils/parseUserInfo'

describe 'parseUserInfo utility', ->
  describe 'when valid input', ->
    it 'should parse user info', ->
      expect(parseUserInfo '1234@userName.User.AnimeBytes') .to.deep.equal
        user: '1234@userName'
        rank: 'User'

    it 'should throw on wrong host', ->
      expect(-> parseUserInfo '1234@userName.User.SomethingElse')
        .to.throw ParseUserInfoWrongHost

  describe 'when invalid input', ->
    it 'should throw on invalid input', ->
      expect(-> parseUserInfo null) .to.throw ParseUserInfoInvalidInput
      expect(-> parseUserInfo undefined) .to.throw ParseUserInfoInvalidInput
      expect(-> parseUserInfo []) .to.throw ParseUserInfoInvalidInput
      expect(-> parseUserInfo {}) .to.throw ParseUserInfoInvalidInput

    it 'should throw on missing user', ->
      expect(-> parseUserInfo '') .to.throw ParseUserInfoMissingUser

    it 'should throw on missing rank', ->
      expect(-> parseUserInfo 'user.') .to.throw ParseUserInfoMissingRank

    it 'should throw on missing host', ->
      expect(-> parseUserInfo 'user.rank.') .to.throw ParseUserInfoMissingHost
