import { expect } from 'chai';
import { createSandbox, SinonSandbox, SinonStub, assert } from 'sinon';
import * as user from '../commands/user';
import { IRCClient } from '../clients/irc';
import { ABClient } from '../clients/animebytes';
import * as utils from '../utils';
import { CustomFailure } from '../errors';

describe('User', () => {
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
      user.listenForUser();
      assert.calledOnce(hookStub);
    });
  });

  describe('!user', () => {
    let userCallback: any;
    let callUser: SinonStub;
    let eventReply: SinonStub;
    let parseUserStub: SinonStub;
    // let userInfoByNickStub: SinonStub;
    beforeEach(() => {
      user.listenForUser();
      userCallback = hookStub.getCall(0).args[1];
      eventReply = sandbox.stub();
      parseUserStub = sandbox.stub(utils, 'parseUserHost').returns({ user: 'thing' } as any);
      callUser = sandbox.stub(ABClient, 'getUserInfo').resolves('reply');
      // userInfoByNickStub = sandbox.stub(user, 'getUserInfoByIRCNick');
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

    it('Replies with internal error if the call to AB fails', async () => {
      callUser.throws(new Error());
      await userCallback({ privateMessage: false, message: '!user', reply: eventReply });
      assert.calledWithExactly(eventReply, 'Internal error');
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
  });

  describe('getUserInfoByIRCNick', () => {
    let callUser: SinonStub;
    let parseUserStub: SinonStub;
    let whoisStub: SinonStub;
    beforeEach(() => {
      parseUserStub = sandbox.stub(utils, 'parseUserHost').returns({ user: 'thing' } as any);
      callUser = sandbox.stub(ABClient, 'getUserInfo').resolves('reply');
      whoisStub = sandbox.stub(IRCClient, 'whois').resolves({ hostname: 'hostname' } as any);
    });

    it('Throws NotFound if whois call fails', async () => {
      whoisStub.throws(new Error());
      try {
        await user.getUserInfoByIRCNick('nick');
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
        await user.getUserInfoByIRCNick('nick');
      } catch (e) {
        assert.calledWithExactly(parseUserStub, 'hostname');
        return expect(e.code).to.equal('NotFound');
      }
      return expect.fail('Did not throw');
    });

    it('Returns value from AB getUserInfo if successful', async () => {
      expect(await user.getUserInfoByIRCNick('nick')).to.equal('reply');
      assert.calledWithExactly(callUser, 'thing');
    });
  });
});
