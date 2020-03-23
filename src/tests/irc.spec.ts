import { expect } from 'chai';
import { createSandbox, SinonSandbox, SinonStub, assert } from 'sinon';
import { IRCClient } from '../clients/irc';
import * as configuration from '../clients/configuration';

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
      let saveChannelStub: SinonStub;
      beforeEach(() => {
        inviteHandler = IRCClient.bot.listeners('invite')[0];
        isIgnoredStub = sandbox.stub(IRCClient, 'isIgnoredUser').returns(false);
        isMeStub = sandbox.stub(IRCClient, 'isMe').returns(true);
        joinStub = sandbox.stub(IRCClient, 'joinRoom');
        saveChannelStub = sandbox.stub(configuration, 'saveChannels');
      });

      it('Ignores invites from ignored users', async () => {
        isIgnoredStub.returns(true);
        await inviteHandler({});
        assert.notCalled(joinStub);
      });

      it('Ignores invites that are not to the bot', async () => {
        isMeStub.returns(false);
        await inviteHandler({});
        assert.notCalled(joinStub);
      });

      it('Joins a channel on an invite', async () => {
        await inviteHandler({ channel: 'channel' });
        assert.calledWithExactly(joinStub, 'channel');
      });

      it('Saves joined channel', async () => {
        await inviteHandler({ channel: 'channel' });
        assert.calledWithExactly(saveChannelStub, { channel: { join: 'join', persist: false } });
      });

      it('Does not save channel if join fails', async () => {
        joinStub.throws(new Error('bad'));
        try {
          await inviteHandler({ channel: 'channel' });
        } catch (e) {
          return assert.notCalled(saveChannelStub);
        }
        return expect.fail('Did not throw');
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
        rejectUnauthorized: IRCClient.IRC_VERIFY_SSL,
      });
    });
  });

  describe('shutDown', () => {
    let frameworkQuitStub: SinonStub;
    beforeEach(() => {
      frameworkQuitStub = sandbox.stub(IRCClient.bot, 'quit');
    });
    it('attempts to connect to IRC with specified params', () => {
      IRCClient.shutDown();
      assert.calledOnce(frameworkQuitStub);
    });
  });

  describe('postOper', () => {
    let rawCommandStub: SinonStub;
    let joinWithAdminRoomStub: SinonStub;
    let joinRoomStub: SinonStub;
    let getChannelsStub: SinonStub;
    let deleteChannelStub: SinonStub;
    beforeEach(() => {
      rawCommandStub = sandbox.stub(IRCClient, 'rawCommand');
      joinWithAdminRoomStub = sandbox.stub(IRCClient, 'joinRoomWithAdminIfNecessary');
      joinRoomStub = sandbox.stub(IRCClient, 'joinRoom');
      getChannelsStub = sandbox.stub(configuration, 'getAllChannels');
      deleteChannelStub = sandbox.stub(configuration, 'deleteChannel');
    });

    it('Sets registered to true on IRCClient', async () => {
      sandbox.replace(IRCClient, 'registered', false);
      await IRCClient.postOper();
      expect(IRCClient.registered).to.be.true;
    });

    it('Performs MODE and CHGHOST', async () => {
      await IRCClient.postOper();
      assert.calledWithExactly(rawCommandStub.getCall(0), 'MODE', IRCClient.IRC_NICK, '+B');
      assert.calledWithExactly(rawCommandStub.getCall(1), 'CHGHOST', IRCClient.IRC_NICK, 'bakus.dungeon');
    });

    it('Performs SAJOIN for channels in saved config with sajoin type', async () => {
      getChannelsStub.resolves({ channel: { persist: true, join: 'sajoin' } });
      await IRCClient.postOper();
      assert.calledWithExactly(rawCommandStub.getCall(2), 'SAJOIN', IRCClient.IRC_NICK, 'channel');
    });

    it('Calls joinRoomWithAdminIfNecessary for channels in saved config with auto type', async () => {
      getChannelsStub.resolves({ channel: { persist: true, join: 'auto' } });
      await IRCClient.postOper();
      assert.calledWithExactly(joinWithAdminRoomStub, 'channel');
    });

    it('Calls joinRoom for channels in saved config with join type', async () => {
      getChannelsStub.resolves({ channel: { persist: true, join: 'join' } });
      await IRCClient.postOper();
      assert.calledWithExactly(joinRoomStub, 'channel');
    });

    it('Calls deleteChannel for channels which failed to join with join type and persist false in saved config', async () => {
      getChannelsStub.resolves({ channel: { persist: false, join: 'join' } });
      joinRoomStub.throws(new Error());
      await IRCClient.postOper();
      assert.calledWithExactly(deleteChannelStub, 'channel');
    });

    it('Does not call deleteChannel for channels which failed to join with join type and persist true in saved config', async () => {
      getChannelsStub.resolves({ channel: { persist: true, join: 'join' } });
      joinRoomStub.throws(new Error());
      await IRCClient.postOper();
      assert.notCalled(deleteChannelStub);
    });
  });

  describe('joinRoom', () => {
    beforeEach(() => {
      sandbox.stub(IRCClient, 'rawCommand');
    });

    it('Returns a promise', () => {
      expect(IRCClient.joinRoom('channel')).to.be.instanceOf(Promise);
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

    it('Sends multiple messages when there are newlines in the message', () => {
      IRCClient.message('chan', 'message\nanother');
      assert.calledWithExactly(sayStub.getCall(0), 'chan', 'message');
      assert.calledWithExactly(sayStub.getCall(1), 'chan', 'another');
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

  describe('whois', () => {
    let checkIfRegisteredStub: SinonStub;
    let whoisStub: SinonStub;
    beforeEach(() => {
      checkIfRegisteredStub = sandbox.stub(IRCClient, 'checkIfRegistered');
      whoisStub = sandbox.stub(IRCClient as any, 'bot_whois').resolves({ some: 'data' });
    });

    it('Checks if connected when performing command', async () => {
      await IRCClient.whois('chan');
      assert.calledOnce(checkIfRegisteredStub);
    });

    it('Passes and returns the correct arguments to the irc framework', async () => {
      expect(await IRCClient.whois('chan')).to.deep.equal({ some: 'data' });
      assert.calledWithExactly(whoisStub, 'chan');
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
