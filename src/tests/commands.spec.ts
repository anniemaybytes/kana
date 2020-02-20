import { createSandbox, SinonSandbox, SinonStub, assert } from 'sinon';
import { addCommands } from '../commands';
import { IRCClient } from '../clients/irc';

describe('Commands', () => {
  let sandbox: SinonSandbox;
  let hookStub: SinonStub;

  beforeEach(() => {
    sandbox = createSandbox();
    hookStub = sandbox.stub(IRCClient, 'addMessageHook');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('addCommands', () => {
    it('Adds message hooks to the IRC bot', () => {
      addCommands();
      assert.called(hookStub);
    });
  });
});
