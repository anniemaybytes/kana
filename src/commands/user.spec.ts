import { createSandbox, SinonSandbox, SinonStub, assert } from 'sinon';
import { expect } from 'chai';

import { UserCommand } from './user.js';
import { IRCClient } from '../clients/irc.js';
import { ABClient } from '../clients/animebytes.js';
import { Utils } from '../utils.js';
import { CustomFailure } from '../errors.js';

describe('UserCommand', () => {
  let sandbox: SinonSandbox;
  let hookStub: SinonStub;

  beforeEach(() => {
    sandbox = createSandbox();

    hookStub = sandbox.stub(IRCClient, 'addMessageHook');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('listenForUser', () => {
    it('Calls addMessageHook on the IRC bot', () => {
      UserCommand.register();
      assert.calledOnce(hookStub);
    });
  });

  describe('!user', () => {
    let userCallback: any;
    let callUser: SinonStub;
    let eventReply: SinonStub;
    let parseUserStub: SinonStub;
    let ircWhoisStub: SinonStub;

    beforeEach(() => {
      UserCommand.register();
      userCallback = hookStub.getCall(0).args[1];
      eventReply = sandbox.stub();
      ircWhoisStub = sandbox.stub(IRCClient, 'whois').resolves({ hostname: 'whatever' } as any);
      parseUserStub = sandbox.stub(Utils, 'parseUserHost').returns({ user: 'thing' } as any);
      callUser = sandbox.stub(ABClient, 'getUserInfo').resolves('reply');
    });

    it('Does not respond if a private message', async () => {
      await userCallback({ privateMessage: true, message: '!user', reply: eventReply });
      assert.notCalled(eventReply);
    });

    it('Replies with not authorized if not a valid AB user hostname', async () => {
      parseUserStub.throws(new CustomFailure('InvalidABUser'));
      await userCallback({ privateMessage: false, message: '!user', hostname: 'value', reply: eventReply });
      assert.calledWithExactly(parseUserStub, 'value');
      assert.calledWithExactly(eventReply, 'Not authorized');
    });

    it('Replies with error if the call to AB fails', async () => {
      callUser.throws(new Error());
      await userCallback({ privateMessage: false, message: '!user', reply: eventReply });
      assert.calledWithExactly(eventReply, 'An error has occured, please try again later');
    });

    it('Replies with user not found if NotFound error (404) from AB', async () => {
      callUser.throws(new CustomFailure('NotFound'));
      await userCallback({ privateMessage: false, message: '!user', reply: eventReply });
      assert.calledWithExactly(eventReply, 'User not found');
    });

    it('Replies with the response of the AB getUserInfo call if successful', async () => {
      await userCallback({ privateMessage: false, message: '!user', reply: eventReply });
      assert.calledWithExactly(callUser, 'thing');
      assert.calledWithExactly(eventReply, 'reply');
    });

    it('Uses username from command if provided', async () => {
      await userCallback({ privateMessage: false, message: '!user whoisthat', reply: eventReply });
      assert.calledWithExactly(callUser, 'whoisthat');
      assert.calledWithExactly(eventReply, 'reply');
    });

    it('Gets user info by irc nick if name is prepended with @', async () => {
      await userCallback({ privateMessage: false, message: '!user @whoisthat', reply: eventReply });
      assert.calledWithExactly(ircWhoisStub, 'whoisthat'); // check that irc handler was invoked via stubbed whois call
      assert.calledWithExactly(eventReply, 'reply');
    });
  });

  describe('getUserInfoByIRCNick', () => {
    let callUser: SinonStub;
    let parseUserStub: SinonStub;
    let whoisStub: SinonStub;

    beforeEach(() => {
      parseUserStub = sandbox.stub(Utils, 'parseUserHost').returns({ user: 'thing' } as any);
      callUser = sandbox.stub(ABClient, 'getUserInfo').resolves('reply');
      whoisStub = sandbox.stub(IRCClient, 'whois').resolves({ hostname: 'hostname' } as any);
    });

    it('Throws NotFound if whois call fails', async () => {
      whoisStub.throws(new Error());
      try {
        await UserCommand.getUserInfoByIRCNick('nick');
      } catch (e) {
        assert.calledWithExactly(whoisStub, 'nick');
        assert.notCalled(parseUserStub);
        return expect(e.code).to.equal('NotFound');
      }
      return expect.fail('Did not throw');
    });

    it('Throws NotFound if parseUserHost fails', async () => {
      parseUserStub.throws(new Error());
      try {
        await UserCommand.getUserInfoByIRCNick('nick');
      } catch (e) {
        assert.calledWithExactly(parseUserStub, 'hostname');
        return expect(e.code).to.equal('NotFound');
      }
      return expect.fail('Did not throw');
    });

    it('Returns value from AB getUserInfo if successful', async () => {
      expect(await UserCommand.getUserInfoByIRCNick('nick')).to.equal('reply');
      assert.calledWithExactly(callUser, 'thing');
    });
  });
});
