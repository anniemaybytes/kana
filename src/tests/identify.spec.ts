import { expect } from 'chai';
import { createSandbox, SinonSandbox, SinonStub, assert } from 'sinon';
import { listenForIdentifyMsg } from '../commands/identify';
import { IRCClient } from '../clients/irc';
import { ABClient } from '../clients/animebytes';

describe('Identify', () => {
  let sandbox: SinonSandbox;
  let hookStub: SinonStub;

  beforeEach(() => {
    sandbox = createSandbox();
    hookStub = sandbox.stub(IRCClient, 'addMessageHook');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('listenForEnterMsg', () => {
    it('Calls addMessageHook on the IRC bot', () => {
      listenForIdentifyMsg();
      assert.calledOnce(hookStub);
    });
  });

  describe('PRIVMSG identify', () => {
    let identifyCallback: any;
    let authUser: SinonStub;
    let eventReply: SinonStub;
    let rawCommandStub: SinonStub;
    beforeEach(() => {
      listenForIdentifyMsg();
      identifyCallback = hookStub.getCall(0).args[1];
      eventReply = sandbox.stub();
      authUser = sandbox.stub(ABClient, 'authUserForRooms').resolves({
        success: true,
        id: 1234,
        host: 'user.class.AnimeBytes',
        channels: {},
      } as any);
      rawCommandStub = sandbox.stub(IRCClient, 'rawCommand');
    });

    it('Does not respond if not a private message', async () => {
      await identifyCallback({ privateMessage: false, message: 'identify user key', reply: eventReply });
      assert.notCalled(eventReply);
      assert.notCalled(authUser);
      assert.notCalled(rawCommandStub);
    });

    it('Does not respond if it fails to match the regex', async () => {
      await identifyCallback({ privateMessage: true, message: 'badMessage', reply: eventReply });
      assert.notCalled(eventReply);
      assert.notCalled(authUser);
      assert.notCalled(rawCommandStub);
    });

    it('Replies with error if calling AB fails', async () => {
      authUser.throws(new Error());
      await identifyCallback({ privateMessage: true, message: 'identify user key', reply: eventReply });
      assert.calledWithExactly(eventReply, 'Internal error');
      assert.notCalled(rawCommandStub);
    });

    it('Replies with error from AB call if API call success is false', async () => {
      authUser.resolves({
        success: false,
        error: 'custom text',
      });
      await identifyCallback({ privateMessage: true, message: 'identify user key', reply: eventReply });
      assert.calledWithExactly(eventReply, 'custom text');
      assert.notCalled(rawCommandStub);
    });

    it('Calls CHGIDENT and CHGHOST with values from AB API if successful', async () => {
      await identifyCallback({ privateMessage: true, nick: 'eventNick', message: 'identify user key', reply: eventReply });
      assert.calledWithExactly(authUser, 'user', 'key', []);
      assert.called(rawCommandStub);
      expect(rawCommandStub.getCall(0).args).to.deep.equal(['CHGIDENT', 'eventNick', '1234']);
      expect(rawCommandStub.getCall(1).args).to.deep.equal(['CHGHOST', 'eventNick', 'user.class.AnimeBytes']);
    });
  });
});
