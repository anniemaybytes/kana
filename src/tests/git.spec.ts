import { createSandbox, SinonSandbox, SinonStub, assert } from 'sinon';
import { IRCClient } from '../clients/irc';
import { handleGitWebhook } from '../webhooks/git';

describe('Git Webhook', () => {
  let sandbox: SinonSandbox;
  let stubSendMessage: SinonStub;
  let resStub: SinonStub;

  beforeEach(() => {
    sandbox = createSandbox();
    stubSendMessage = sandbox.stub(IRCClient, 'message');
    resStub = sandbox.stub();
    process.env.GIT_CHANNEL = 'testchannel';
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('Does not send a message for events that are not push, create, or delete', async () => {
    await handleGitWebhook({ body: { ref: 'branchname' }, get: () => 'bogus' } as any, { send: resStub } as any, sandbox.stub() as any);
    assert.notCalled(stubSendMessage);
    assert.calledOnce(resStub);
  });

  it('Does not send a message for push events where there are no commits', async () => {
    await handleGitWebhook({ body: { ref: 'branchname', commits: [] }, get: () => 'push' } as any, { send: resStub } as any, sandbox.stub() as any);
    assert.notCalled(stubSendMessage);
    assert.calledOnce(resStub);
  });

  it('Sends correct message for delete event', async () => {
    await handleGitWebhook(
      { body: { ref: 'branchname', sender: { login: 'user' }, ref_type: 'branch', repository: { name: 'repo' } }, get: () => 'delete' } as any,
      { send: resStub } as any,
      sandbox.stub() as any
    );
    assert.calledWithExactly(
      stubSendMessage,
      'testchannel',
      '\x02u\u200Bs\u200Be\u200Br\x02 deleted branch \x02b\u200Br\u200Ba\u200Bn\u200Bc\u200Bh\u200Bn\u200Ba\u200Bm\u200Be\x02 on \x02repo\x02'
    );
    assert.calledOnce(resStub);
  });

  it('Sends correct message for create event', async () => {
    await handleGitWebhook(
      { body: { ref: 'branchname', sender: { login: 'user' }, ref_type: 'branch', repository: { name: 'repo' } }, get: () => 'create' } as any,
      { send: resStub } as any,
      sandbox.stub() as any
    );
    assert.calledWithExactly(
      stubSendMessage,
      'testchannel',
      '\x02u\u200Bs\u200Be\u200Br\x02 created new branch \x02b\u200Br\u200Ba\u200Bn\u200Bc\u200Bh\u200Bn\u200Ba\u200Bm\u200Be\x02 on \x02repo\x02'
    );
    assert.calledOnce(resStub);
  });

  it('Sends correct message for push event with single commit', async () => {
    await handleGitWebhook(
      {
        body: {
          ref: 'branchname',
          commits: [{ author: { name: 'gituser' }, message: 'commit message', url: 'https://git.bogus/bffeb74224043ba2feb48d137756c8a9331c449a' }],
          sender: { login: 'user' },
          repository: { name: 'repo' },
        },
        get: () => 'push',
      } as any,
      { send: resStub } as any,
      sandbox.stub() as any
    );
    assert.calledWithExactly(
      stubSendMessage.getCall(0),
      'testchannel',
      '\x02u\u200Bs\u200Be\u200Br\x02 pushed \x021\x02 commits to \x02b\u200Br\u200Ba\u200Bn\u200Bc\u200Bh\u200Bn\u200Ba\u200Bm\u200Be\x02 on \x02repo\x02:'
    );
    assert.calledWithExactly(
      stubSendMessage.getCall(1),
      'testchannel',
      ' * g\u200Bi\u200Bt\u200Bu\u200Bs\u200Be\u200Br: commit message (\x1fhttps://git.bogus/bffeb7422\x1f)'
    );
    assert.calledOnce(resStub);
  });

  it('Sends correct message for push event with multiple commits', async () => {
    await handleGitWebhook(
      {
        body: {
          ref: 'branchname',
          compare_url: 'https://git.bogus/fullcompare',
          commits: [
            { author: { name: 'gituser' }, message: 'commit message', url: 'https://git.bogus/bffeb74224043ba2feb48d137756c8a9331c449a' },
            { author: { name: 'gituser2' }, message: 'commit message2', url: 'https://git.bogus/abfeb74224043ba2feb48d137756c8a9331c449a' },
          ],
          sender: { login: 'user' },
          repository: { name: 'repo' },
        },
        get: () => 'push',
      } as any,
      { send: resStub } as any,
      sandbox.stub() as any
    );
    assert.calledWithExactly(
      stubSendMessage.getCall(0),
      'testchannel',
      '\x02u\u200Bs\u200Be\u200Br\x02 pushed \x022\x02 commits to \x02b\u200Br\u200Ba\u200Bn\u200Bc\u200Bh\u200Bn\u200Ba\u200Bm\u200Be\x02 on \x02repo\x02:'
    );
    assert.calledWithExactly(
      stubSendMessage.getCall(1),
      'testchannel',
      ' * g\u200Bi\u200Bt\u200Bu\u200Bs\u200Be\u200Br: commit message (\x1fhttps://git.bogus/bffeb7422\x1f)'
    );
    assert.calledWithExactly(
      stubSendMessage.getCall(2),
      'testchannel',
      ' * g\u200Bi\u200Bt\u200Bu\u200Bs\u200Be\u200Br\u200B2: commit message2 (\x1fhttps://git.bogus/abfeb7422\x1f)'
    );
    assert.calledWithExactly(stubSendMessage.getCall(3), 'testchannel', 'Entire diff: \x1fhttps://git.bogus/fullcompare\x1f');
    assert.calledOnce(resStub);
  });
});
