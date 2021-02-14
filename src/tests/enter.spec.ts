import { expect } from 'chai';
import { createSandbox, SinonSandbox, SinonStub, assert } from 'sinon';
import { listenForEnterMsg } from '../commands/enter';
import { IRCClient } from '../clients/irc';
import { ABClient } from '../clients/animebytes';

describe('Enter', () => {
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
      listenForEnterMsg();
      assert.calledOnce(hookStub);
    });
  });

  describe('PRIVMSG enter', () => {
    let enterCallback: any;
    let authUser: SinonStub;
    let eventReply: SinonStub;
    let rawCommandStub: SinonStub;
    beforeEach(() => {
      listenForEnterMsg();
      enterCallback = hookStub.getCall(0).args[1];
      eventReply = sandbox.stub();
      authUser = sandbox.stub(ABClient, 'authUserForRooms').resolves({
        success: true,
        id: 1234,
        host: 'user.class.AnimeBytes',
        channels: { room: true, badRoom: false },
      } as any);
      rawCommandStub = sandbox.stub(IRCClient, 'rawCommand');
    });

    it('Does not respond if not a private message', async () => {
      await enterCallback({ privateMessage: false, message: 'enter room,badRoom user key', reply: eventReply });
      assert.notCalled(eventReply);
      assert.notCalled(authUser);
      assert.notCalled(rawCommandStub);
    });

    it('Does not respond if it fails to match the regex', async () => {
      await enterCallback({ privateMessage: true, message: 'badMessage', reply: eventReply });
      assert.notCalled(eventReply);
      assert.notCalled(authUser);
      assert.notCalled(rawCommandStub);
    });

    it('Replies with error if calling AB fails', async () => {
      authUser.throws(new Error());
      await enterCallback({ privateMessage: true, message: 'enter room,badRoom user key', reply: eventReply });
      assert.calledWithExactly(eventReply, 'Unable to identify you at the moment, please try again later');
      assert.notCalled(rawCommandStub);
    });

    it('Replies with error from AB call if API call success is false', async () => {
      authUser.resolves({
        success: false,
        error: 'custom text',
      });
      await enterCallback({ privateMessage: true, message: 'enter room,badRoom user key', reply: eventReply });
      assert.calledWithExactly(eventReply, 'custom text');
      assert.notCalled(rawCommandStub);
    });

    it('Calls CHGIDENT and CHGHOST with values from AB API if successful', async () => {
      await enterCallback({ privateMessage: true, nick: 'eventNick', message: 'enter room,badRoom user key', reply: eventReply });
      assert.calledWithExactly(authUser, 'user', 'key', ['room', 'badroom']);
      assert.called(rawCommandStub);
      expect(rawCommandStub.getCall(0).args).to.deep.equal(['CHGIDENT', 'eventNick', '1234']);
      expect(rawCommandStub.getCall(1).args).to.deep.equal(['CHGHOST', 'eventNick', 'user.class.AnimeBytes']);
    });

    it('Replies with access denied for rooms which were denied', async () => {
      await enterCallback({ privateMessage: true, nick: 'eventNick', message: 'enter room,badRoom user key', reply: eventReply });
      assert.calledWithExactly(eventReply, 'Access denied for badRoom');
    });

    it('Calls SAJOIN for authed returned rooms', async () => {
      await enterCallback({ privateMessage: true, nick: 'eventNick', message: 'enter room,badRoom user key', reply: eventReply });
      expect(rawCommandStub.getCall(2).args).to.deep.equal(['SAJOIN', 'eventNick', 'room']);
    });
  });
});
