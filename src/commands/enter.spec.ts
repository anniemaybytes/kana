import { createSandbox, SinonSandbox, SinonStub, assert } from 'sinon';
import { expect } from 'chai';

import { EnterCommand } from './enter.js';
import { IRCClient } from '../clients/irc.js';
import { ABClient } from '../clients/animebytes.js';

describe('EnterCommand', () => {
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
      EnterCommand.register();
      assert.calledOnce(hookStub);
    });
  });

  describe('PRIVMSG enter', () => {
    let enterCallback: any;
    let authUserStub: SinonStub;
    let eventReplyStub: SinonStub;
    let rawCommandStub: SinonStub;

    beforeEach(() => {
      EnterCommand.register();
      enterCallback = hookStub.getCall(0).args[1];

      eventReplyStub = sandbox.stub();
      authUserStub = sandbox.stub(ABClient, 'authUserForRooms').resolves({
        success: true,
        id: 1234,
        host: 'user.class.AnimeBytes',
        channels: { room: true, badRoom: false },
      } as any);
      rawCommandStub = sandbox.stub(IRCClient, 'rawCommand');
    });

    it('Does not respond if not a private message', async () => {
      await enterCallback({ privateMessage: false, message: 'enter room,badRoom user key', reply: eventReplyStub });
      assert.notCalled(eventReplyStub);
      assert.notCalled(authUserStub);
      assert.notCalled(rawCommandStub);
    });

    it('Does not respond if it fails to match the regex', async () => {
      await enterCallback({ privateMessage: true, message: 'badMessage', reply: eventReplyStub });
      assert.notCalled(eventReplyStub);
      assert.notCalled(authUserStub);
      assert.notCalled(rawCommandStub);
    });

    it('Replies with error if calling AB fails', async () => {
      authUserStub.throws(new Error());
      await enterCallback({ privateMessage: true, message: 'enter room,badRoom user key', reply: eventReplyStub });
      assert.calledWithExactly(eventReplyStub, 'Unable to identify you at the moment, please try again later');
      assert.notCalled(rawCommandStub);
    });

    it('Replies with error from AB call if API call success is false', async () => {
      authUserStub.resolves({
        success: false,
        error: 'custom text',
      });
      await enterCallback({ privateMessage: true, message: 'enter room,badRoom user key', reply: eventReplyStub });
      assert.calledWithExactly(eventReplyStub, 'custom text');
      assert.notCalled(rawCommandStub);
    });

    it('Calls CHGIDENT and CHGHOST with values from AB API if successful', async () => {
      await enterCallback({ privateMessage: true, nick: 'eventNick', message: 'enter room,badRoom user key', reply: eventReplyStub });
      assert.calledWithExactly(authUserStub, 'user', 'key', ['room', 'badroom']);
      assert.called(rawCommandStub);
      expect(rawCommandStub.getCall(0).args).to.deep.equal(['CHGIDENT', 'eventNick', '1234']);
      expect(rawCommandStub.getCall(1).args).to.deep.equal(['CHGHOST', 'eventNick', 'user.class.AnimeBytes']);
    });

    it('Replies with access denied for rooms which were denied', async () => {
      await enterCallback({ privateMessage: true, nick: 'eventNick', message: 'enter room,badRoom user key', reply: eventReplyStub });
      assert.calledWithExactly(eventReplyStub, 'Access denied for badRoom');
    });

    it('Calls SAJOIN for authed returned rooms', async () => {
      await enterCallback({ privateMessage: true, nick: 'eventNick', message: 'enter room,badRoom user key', reply: eventReplyStub });
      expect(rawCommandStub.getCall(2).args).to.deep.equal(['SAJOIN', 'eventNick', 'room']);
    });
  });
});
