import { expect } from 'chai';
import { createSandbox, SinonSandbox, SinonStub, assert } from 'sinon';
import { IRCClient } from '../clients/irc';

describe('IRCClient', () => {
  let sandbox: SinonSandbox;

  beforeEach(() => {
    sandbox = createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('Handlers', () => {
    it('has a registered close handler', () => {
      expect(IRCClient.bot.listeners('close').length).to.equal(1);
    });

    it('has a registered registered handler', () => {
      expect(IRCClient.bot.listeners('registered').length).to.equal(1);
    });

    it('has a registered invite handler', () => {
      expect(IRCClient.bot.listeners('invite').length).to.equal(1);
    });

    describe('Close Handler', () => {
      let closeHandler: any;
      beforeEach(() => {
        closeHandler = IRCClient.bot.listeners('close')[0];
        sandbox.replace(IRCClient, 'registered', true);
      });

      it('Sets IRCClient registered to false', () => {
        closeHandler();
        expect(IRCClient.registered).to.be.false;
      });
    });

    describe('Unknown command handler', () => {
      let commandHandler: any;
      let postOperStub: SinonStub;
      beforeEach(() => {
        commandHandler = IRCClient.bot.listeners('unknown command')[0];
        postOperStub = sandbox.stub(IRCClient, 'postOper');
      });

      it('Calls postOper on RPL_NOWOPER (381)', () => {
        commandHandler({ command: '381' });
        assert.calledOnce(postOperStub);
      });

      it('Does not call postOper when not RPL_NOWOPER', () => {
        commandHandler({ command: '491' });
        commandHandler({ command: '100' });
        assert.notCalled(postOperStub);
      });
    });

    describe('Invite Handler', () => {
      let inviteHandler: any;
      let isIgnoredStub: SinonStub;
      let isMeStub: SinonStub;
      let joinStub: SinonStub;
      beforeEach(() => {
        inviteHandler = IRCClient.bot.listeners('invite')[0];
        isIgnoredStub = sandbox.stub(IRCClient, 'isIgnoredUser').returns(false);
        isMeStub = sandbox.stub(IRCClient, 'isMe').returns(true);
        joinStub = sandbox.stub(IRCClient.bot, 'join');
      });

      it('Ignores invites from ignored users', () => {
        isIgnoredStub.returns(true);
        inviteHandler({});
        assert.notCalled(joinStub);
      });

      it('Ignores invites that are not to the bot', () => {
        isMeStub.returns(false);
        inviteHandler({});
        assert.notCalled(joinStub);
      });

      it('Joins a channel on an invite', () => {
        inviteHandler({ channel: 'channel' });
        assert.calledWithExactly(joinStub, 'channel');
      });
    });
  });

  describe('isIgnoredUser', () => {
    it('returns true if user should be ignored', () => {
      sandbox.replace(IRCClient, 'IGNORED_USERS', { ignorethem: true });
      expect(IRCClient.isIgnoredUser('ignoreThem')).to.be.true;
    });

    it('returns false if user should not be ignored', () => {
      sandbox.replace(IRCClient, 'IGNORED_USERS', { ignoreThem: true });
      expect(IRCClient.isIgnoredUser('isAllowed')).to.be.false;
    });
  });

  describe('isMe', () => {
    it('returns true if user is the bot', () => {
      sandbox.replace(IRCClient, 'IRC_NICK_LOWER', 'me');
      expect(IRCClient.isMe('Me')).to.be.true;
    });

    it('returns false if user is not the bot', () => {
      sandbox.replace(IRCClient, 'IRC_NICK_LOWER', 'me');
      expect(IRCClient.isMe('notMe')).to.be.false;
    });
  });

  describe('checkIfRegistered', () => {
    it('Should do nothing if registered', () => {
      sandbox.replace(IRCClient, 'registered', true);
      IRCClient.checkIfRegistered();
    });

    it('Should throw error if not registered', () => {
      sandbox.replace(IRCClient, 'registered', false);
      try {
        IRCClient.checkIfRegistered();
      } catch (e) {
        return;
      }
      expect.fail('Did not throw');
    });
  });

  describe('connect', () => {
    let frameworkConnectStub: SinonStub;
    beforeEach(() => {
      frameworkConnectStub = sandbox.stub(IRCClient.bot, 'connect');
    });
    it('attempts to connect to IRC with specified params', () => {
      IRCClient.connect();
      assert.calledWith(frameworkConnectStub, {
        host: IRCClient.IRC_SERVER,
        port: IRCClient.IRC_PORT,
        nick: IRCClient.IRC_NICK,
        username: IRCClient.IRC_USERNAME,
        gecos: IRCClient.IRC_REALNAME,
        ssl: IRCClient.IRC_USE_SSL,
        rejectUnauthorized: IRCClient.IRC_VERIFY_SSL
      });
    });
  });

  describe('postOper', () => {
    let rawCommandStub: SinonStub;
    let joinRoomStub: SinonStub;
    beforeEach(() => {
      rawCommandStub = sandbox.stub(IRCClient, 'rawCommand');
      joinRoomStub = sandbox.stub(IRCClient, 'joinRoomWithAdminIfNecessary');
    });

    it('Sets registered to true on IRCClient', () => {
      sandbox.replace(IRCClient, 'registered', false);
      IRCClient.postOper();
      expect(IRCClient.registered).to.be.true;
    });

    it('Performs MODE and CHGHOST', () => {
      IRCClient.postOper();
      assert.calledWithExactly(rawCommandStub.getCall(0), 'MODE', IRCClient.IRC_NICK, '+B');
      assert.calledWithExactly(rawCommandStub.getCall(1), 'CHGHOST', IRCClient.IRC_NICK, 'bakus.dungeon');
    });

    it('Tries to join all channels in CHANNELS env var', () => {
      process.env.CHANNELS = 'a,b,c';
      IRCClient.postOper();
      assert.calledWithExactly(joinRoomStub.getCall(0), 'a');
      assert.calledWithExactly(joinRoomStub.getCall(1), 'b');
      assert.calledWithExactly(joinRoomStub.getCall(2), 'c');
    });
  });

  describe('joinRoomWithAdminIfNecessary', () => {
    beforeEach(() => {
      sandbox.stub(IRCClient, 'rawCommand');
    });

    it('Returns a promise', () => {
      expect(IRCClient.joinRoomWithAdminIfNecessary('channel')).to.be.instanceOf(Promise);
    });
  });

  describe('rawCommand', () => {
    let checkIfRegisteredStub: SinonStub;
    let rawStub: SinonStub;
    beforeEach(() => {
      checkIfRegisteredStub = sandbox.stub(IRCClient, 'checkIfRegistered');
      rawStub = sandbox.stub(IRCClient.bot, 'raw');
    });

    it('Checks if connected when performing command', () => {
      IRCClient.rawCommand('stuff');
      assert.calledOnce(checkIfRegisteredStub);
    });

    it('Generates a string which is passed to the framework raw interface', () => {
      IRCClient.rawCommand('this', 'is', 'a', 'raw', 'command');
      assert.calledWithExactly(rawStub, 'this is a raw command');
    });
  });

  describe('message', () => {
    let checkIfRegisteredStub: SinonStub;
    let sayStub: SinonStub;
    beforeEach(() => {
      checkIfRegisteredStub = sandbox.stub(IRCClient, 'checkIfRegistered');
      sayStub = sandbox.stub(IRCClient.bot, 'say');
    });

    it('Checks if connected when performing command', () => {
      IRCClient.message('chan', 'message');
      assert.calledOnce(checkIfRegisteredStub);
    });

    it('Passes the correct arguments to the irc framework', () => {
      IRCClient.message('chan', 'message');
      assert.calledWithExactly(sayStub, 'chan', 'message');
    });
  });

  describe('who', () => {
    let checkIfRegisteredStub: SinonStub;
    let whoStub: SinonStub;
    beforeEach(() => {
      checkIfRegisteredStub = sandbox.stub(IRCClient, 'checkIfRegistered');
      whoStub = sandbox.stub(IRCClient as any, 'bot_who').resolves({ users: ['blah'] });
    });

    it('Checks if connected when performing command', async () => {
      await IRCClient.who('chan');
      assert.calledOnce(checkIfRegisteredStub);
    });

    it('Passes and returns the correct arguments to the irc framework', async () => {
      expect(await IRCClient.who('chan')).to.deep.equal(['blah']);
      assert.calledWithExactly(whoStub, 'chan');
    });
  });

  describe('addMessageHook', () => {
    let matchMessageStub: SinonStub;
    let callbackWrapperStub: SinonStub;
    beforeEach(() => {
      matchMessageStub = sandbox.stub(IRCClient.bot, 'matchMessage');
      callbackWrapperStub = sandbox.stub(IRCClient, 'callbackWrapper').returns('ok' as any);
    });

    it('Adds the messagehook to the irc-framework with the correct params', () => {
      const myRegex = /.*/;
      const myCallback = () => 'whatever';
      IRCClient.addMessageHook(myRegex, myCallback);
      assert.calledWithExactly(callbackWrapperStub, myCallback);
      assert.calledWithExactly(matchMessageStub, myRegex, 'ok');
    });
  });

  describe('callbackWrapper', () => {
    let isIgnoredStub: SinonStub;
    let isMeStub: SinonStub;
    beforeEach(() => {
      isIgnoredStub = sandbox.stub(IRCClient, 'isIgnoredUser').returns(false);
      isMeStub = sandbox.stub(IRCClient, 'isMe').returns(true);
    });

    it('Generates a callback which doesnt call the user callback if event user is ignored', () => {
      isIgnoredStub.returns(true);
      const userCallback = sandbox.stub();
      const generatedCallback = IRCClient.callbackWrapper(userCallback);
      generatedCallback({} as any);
      assert.notCalled(userCallback);
    });

    it('Generates a callback which sets the privateMessage variable on the event appropriately', () => {
      const userCallback = sandbox.stub();
      isMeStub.returns(false);
      const generatedCallback = IRCClient.callbackWrapper(userCallback);
      generatedCallback({} as any);
      assert.calledWithExactly(userCallback, { privateMessage: false });
    });
  });
});
