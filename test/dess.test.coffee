{expect} = require 'chai'
sinon = require 'sinon'
{TextMessage, loadBot} = require 'hubot'
request = require 'request'


MockIrc = require './mock/Irc'

sandbox = sinon.createSandbox()

describe 'dess script', ->
  mock = null
  beforeEach ->
    port = process.env.HUBOT_IRC_PORT
    mock = MockIrc port, 'utf-8', undefined

    @robot = loadBot '', 'irc', false, 'Hubot'
    @robot.adapter.on 'connected', =>
      require('../scripts/dess')(@robot)
      @user = @robot.adapter.createUser('#mocha', 'dummyUser')

      @adapter = @robot.adapter
      @bot = @adapter.bot

  afterEach (done) ->
    @robot.shutdown()
    @robot.adapter.bot.conn.cyclingPingTimer.stop()
    mock.close(done)


  describe 'when !dess is called', ->
    beforeEach (done) ->
      @robot.run()
      @robot.adapter.bot.on 'connect', =>
        @robot.adapter.bot.disconnect()
        done()
      sandbox.stub request, 'post'

    afterEach ->
      sandbox.restore()

    describe 'when authorized', ->
      it 'should make request', (done) ->
        @user.original =
          host: 'dummyUser.User.AnimeBytes'
        @adapter.receive(new TextMessage(@user, '!dess'))
        mock.on 'end', ->
          expect(request.post.calledOnce).to.equal true
          done()

      it 'should make request with correct data', (done) ->
        @user.original =
          host: 'dummyUser.User.AnimeBytes'
        @adapter.receive(new TextMessage(@user, '!dess'))
        mock.on 'end', ->
          expect(request.post.args[0]).to.deep.include.members [
            'https://animebytes.tv/api/irc/dess_tax'
            form:
              authKey: 'changeme'
              username: 'dummyUser'
          ]
          done()

      it 'should print response', (done) ->
        request.post.yields(null, {statusCode: 200}, JSON.stringify
          message: 'some_response'
        )
        @user.original =
          host: 'dummyUser.User.AnimeBytes'
        @bot.on 'say', (target, text) ->
          expect(target).to.equal '#mocha'
          expect(text[0]).to.equal 'some_response'
          done()
        @adapter.receive(new TextMessage(@user, '!dess'))

      it 'should make request and handle internal error', (done) ->
        request.post.yields('SomeError', {statusCode: 200})
        @bot.on 'say', (target, text) ->
          expect(target).to.equal '#mocha'
          expect(text[0]).to.equal 'Internal error'
          done()
        @adapter.receive(new TextMessage(@user, '!dess'))

      it 'should make request and fail login', (done) ->
        request.post.yields(null, {statusCode: 303})
        @bot.on 'say', (target, text) ->
          expect(target).to.equal '#mocha'
          expect(text[0]).to.equal 'Internal error'
          done()
        @adapter.receive(new TextMessage(@user, '!dess'))

    describe 'when not authorized', ->
      it 'should fail to retrieve user info', (done) ->
        @user.original =
          host: 'userName.something.blargh'
        @bot.on 'say', (target, text) ->
          expect(target).to.equal '#mocha'
          expect(text[0]).to.equal 'Not authorized'
          done()
        @adapter.receive(new TextMessage(@user, '!dess'))
