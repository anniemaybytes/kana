import { createSandbox, SinonSandbox, SinonStub, assert } from 'sinon';
import { listenForDess } from '../commands/dess';
import { IRCClient } from '../clients/irc';
import { ABClient } from '../clients/animebytes';
import * as utils from '../utils';
import { CustomFailure } from '../errors';

describe('Dess', () => {
  let sandbox: SinonSandbox;
  let hookStub: SinonStub;

  beforeEach(() => {
    sandbox = createSandbox();
    hookStub = sandbox.stub(IRCClient, 'addMessageHook');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('listenForDess', () => {
    it('Calls addMessageHook on the IRC bot', () => {
      listenForDess();
      assert.calledOnce(hookStub);
    });
  });

  describe('!dess', () => {
    let dessCallback: any;
    let callDess: SinonStub;
    let eventReply: SinonStub;
    let parseUserStub: SinonStub;
    beforeEach(() => {
      listenForDess();
      dessCallback = hookStub.getCall(0).args[1];
      eventReply = sandbox.stub();
      parseUserStub = sandbox.stub(utils, 'parseUserHost').returns({ user: 'thing' } as any);
      callDess = sandbox.stub(ABClient, 'performDess').resolves('reply');
    });

    it('Does not respond if a private message', async () => {
      await dessCallback({ privateMessage: true, reply: eventReply });
      assert.notCalled(eventReply);
    });

    it('Replies with not authorized if not a valid AB user hostname', async () => {
      parseUserStub.throws(new CustomFailure('InvalidABUser'));
      await dessCallback({ privateMessage: false, hostname: 'value', reply: eventReply });
      assert.calledWithExactly(parseUserStub, 'value');
      assert.calledWithExactly(eventReply, 'Not authorized');
    });

    it('Replies with internal error if the call to AB fails', async () => {
      callDess.throws(new Error());
      await dessCallback({ privateMessage: false, reply: eventReply });
      assert.calledWithExactly(eventReply, 'Internal error');
    });

    it('Replies with the response of the AB dess call if successful', async () => {
      await dessCallback({ privateMessage: false, reply: eventReply });
      assert.calledWithExactly(callDess, 'thing');
      assert.calledWithExactly(eventReply, 'reply');
    });
  });
});
