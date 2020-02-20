import { createSandbox, SinonSandbox, SinonStub, assert } from 'sinon';
import { addSongCommands } from '../commands/symphogay';
import { IRCClient } from '../clients/irc';

describe('Symphogay', () => {
  let sandbox: SinonSandbox;
  let hookStub: SinonStub;

  beforeEach(() => {
    sandbox = createSandbox();
    hookStub = sandbox.stub(IRCClient, 'addMessageHook');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('addSongCommands', () => {
    it('Calls addMessageHook twice to add both song commands', () => {
      addSongCommands();
      assert.calledTwice(hookStub);
    });
  });

  describe('!nana', () => {
    let nanaCallback: any;
    let eventReply: SinonStub;
    beforeEach(() => {
      addSongCommands();
      nanaCallback = hookStub.getCall(0).args[1];
      eventReply = sandbox.stub();
    });

    it('Does not respond if a private message', () => {
      nanaCallback({ privateMessage: true, reply: eventReply });
      assert.notCalled(eventReply);
    });

    it('Does respond if not a private message', () => {
      nanaCallback({ privateMessage: false, reply: eventReply });
      assert.calledOnce(eventReply);
    });
  });

  describe('!metanoia', () => {
    let metanoiaCallback: any;
    let eventReply: SinonStub;
    beforeEach(() => {
      addSongCommands();
      metanoiaCallback = hookStub.getCall(1).args[1];
      eventReply = sandbox.stub();
    });

    it('Does not respond if a private message', () => {
      metanoiaCallback({ privateMessage: true, reply: eventReply });
      assert.notCalled(eventReply);
    });

    it('Does respond if not a private message', () => {
      metanoiaCallback({ privateMessage: false, reply: eventReply });
      assert.calledOnce(eventReply);
    });
  });
});
