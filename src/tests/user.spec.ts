import { createSandbox, SinonSandbox, SinonStub, assert } from 'sinon';
import { listenForUser } from '../commands/user';
import { IRCClient } from '../clients/irc';
import { ABClient } from '../clients/animebytes';
import * as utils from '../utils';

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
      listenForUser();
      assert.calledOnce(hookStub);
    });
  });

  describe('!user', () => {
    let userCallback: any;
    let callUser: SinonStub;
    let eventReply: SinonStub;
    let parseUserStub: SinonStub;
    beforeEach(() => {
      listenForUser();
      userCallback = hookStub.getCall(0).args[1];
      eventReply = sandbox.stub();
      parseUserStub = sandbox.stub(utils, 'parseUserHost').returns({ user: 'thing' } as any);
      callUser = sandbox.stub(ABClient, 'getUserInfo').resolves('reply');
    });

    it('Does not respond if a private message', async () => {
      await userCallback({ privateMessage: true, message: '!user', reply: eventReply });
      assert.notCalled(eventReply);
    });

    it('Replies with not authorized if not a valid AB user hostname', async () => {
      parseUserStub.throws(new utils.InvalidABUser());
      await userCallback({ privateMessage: false, message: '!user', hostname: 'value', reply: eventReply });
      assert.calledWithExactly(parseUserStub, 'value');
      assert.calledWithExactly(eventReply, 'Not authorized');
    });

    it('Replies with internal error if the call to AB fails', async () => {
      callUser.throws(new Error());
      await userCallback({ privateMessage: false, message: '!user', reply: eventReply });
      assert.calledWithExactly(eventReply, 'Internal error');
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
});
