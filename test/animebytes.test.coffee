{expect} = require 'chai'
sinon = require 'sinon'
{TextMessage, loadBot} = require 'hubot'
request = require 'request'


MockIrc = require './mock/Irc'

sandbox = sinon.createSandbox()

describe 'AnimeBytes script', ->
  mock = null
  beforeEach ->
    port = 6667
    mock = MockIrc port, 'utf-8', undefined

    @robot = loadBot '', 'irc', false, 'Hubot'
    @robot.adapter.on 'connected', =>
      require('../scripts/animebytes')(@robot)
      @user = @robot.adapter.createUser('#mocha', 'test_user')

      @adapter = @robot.adapter
      @bot = @adapter.bot

  afterEach (done) ->
    @robot.shutdown()
    @robot.adapter.bot.conn.cyclingPingTimer.stop()
    mock.close(done)

  describe 'when bot is connected', ->
    beforeEach () ->
      mock.server.on 'connection', ->
        mock.send ':localhost 001 Hubot :Welcome\r\n'
      @robot.run()
      @robot.adapter.bot.on 'registered', =>
        @robot.adapter.bot.disconnect()

    it 'should register and set up bot correctly', (done) ->
      mock.on 'end', ->
        expect(mock.incoming).to.deep.equal [
          'NICK Hubot'
          'USER hubot 8 * Hubot'
          'OPER changeme changeme'
          'CHGIDENT Hubot Satsuki'
          'MODE Hubot +B'
          'CHGHOST Hubot bakus.dungeon'
          'SAJOIN Hubot #mocha'
          'QUIT :node-irc says goodbye'
        ]
        done()


  describe 'when !user is called', ->
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
        @adapter.receive(new TextMessage(@user, '!user dummyUser'))
        mock.on 'end', ->
          expect(request.post.calledOnce).to.equal true
          done()

      it 'should make request with correct data', (done) ->
        @adapter.receive(new TextMessage(@user, '!user dummyUser'))
        mock.on 'end', ->
          expect(request.post.args[0]).to.deep.include.members [
            'https://animebytes.tv/api/irc/user_info'
            form:
              authKey: 'changeme'
              username: 'dummyUser'
          ]
          done()

      it 'should get info without a given user', (done) ->
        request.post.yields(null, { statusCode: 200 }, JSON.stringify
          message: 'some_user_data'
        )
        @user.original =
          host: '1234@dummyUser.User.AnimeBytes'
        @bot.on 'say', (target, text) ->
          expect(target).to.equal '#mocha'
          expect(text[0]).to.equal 'some_user_data'
          done()
        @adapter.receive(new TextMessage(@user, '!user'))

      it 'should get info on given user', (done) ->
        request.post.yields(null, { statusCode: 200 }, JSON.stringify
          message: 'some_user_data'
        )
        @bot.on 'say', (target, text) ->
          expect(target).to.equal '#mocha'
          expect(text[0]).to.equal 'some_user_data'
          done()
        @adapter.receive(new TextMessage(@user, '!user dummyUser'))

      it 'should make request and handle internal error', (done) ->
        request.post.yields('SomeError', { statusCode: 200 })
        @bot.on 'say', (target, text) ->
          expect(target).to.equal '#mocha'
          expect(text[0]).to.equal 'Internal error'
          done()
        @adapter.receive(new TextMessage(@user, '!user dummyUser'))

      it 'should make request and fail login', (done) ->
        request.post.yields(null, { statusCode: 303 })
        @bot.on 'say', (target, text) ->
          expect(target).to.equal '#mocha'
          expect(text[0]).to.equal 'Internal error'
          done()
        @adapter.receive(new TextMessage(@user, '!user dummyUser'))
