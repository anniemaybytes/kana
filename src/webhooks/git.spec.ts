import { createSandbox, SinonSandbox, SinonStub, assert } from 'sinon';

import { IRCClient } from '../clients/irc.js';
import { GitWebhook } from './git.js';
import { expect } from 'chai';

describe('GitHook', () => {
  let sandbox: SinonSandbox;
  let sendMessageStub: SinonStub;
  let resStub: SinonStub;

  beforeEach(() => {
    sandbox = createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('handle', () => {
    beforeEach(() => {
      sendMessageStub = sandbox.stub(IRCClient, 'message');
      resStub = sandbox.stub();

      process.env.GIT_CHANNEL = 'testchannel';
    });

    it('Does not send a message for events that are not push, create, or delete', async () => {
      await GitWebhook.handle({ body: { ref: 'branchname' }, get: () => 'bogus' } as any, { send: resStub } as any, sandbox.stub() as any);
      assert.notCalled(sendMessageStub);
      assert.calledOnce(resStub);
    });

    it('Does not send a message for push events where there are no commits', async () => {
      await GitWebhook.handle(
        { body: { ref: 'branchname', commits: [] }, get: () => 'push' } as any,
        { send: resStub } as any,
        sandbox.stub() as any
      );
      assert.notCalled(sendMessageStub);
      assert.calledOnce(resStub);
    });

    it('Sends correct message for delete event', async () => {
      await GitWebhook.handle(
        { body: { ref: 'branchname', sender: { login: 'user' }, ref_type: 'branch', repository: { name: 'repo' } }, get: () => 'delete' } as any,
        { send: resStub } as any,
        sandbox.stub() as any
      );
      assert.calledWithExactly(
        sendMessageStub,
        'testchannel',
        '\x02u\u200Bs\u200Be\u200Br\x02 deleted branch \x02b\u200Br\u200Ba\u200Bn\u200Bc\u200Bh\u200Bn\u200Ba\u200Bm\u200Be\x02 on \x02repo\x02'
      );
      assert.calledOnce(resStub);
    });

    it('Sends correct message for create event', async () => {
      await GitWebhook.handle(
        { body: { ref: 'branchname', sender: { login: 'user' }, ref_type: 'branch', repository: { name: 'repo' } }, get: () => 'create' } as any,
        { send: resStub } as any,
        sandbox.stub() as any
      );
      assert.calledWithExactly(
        sendMessageStub,
        'testchannel',
        '\x02u\u200Bs\u200Be\u200Br\x02 created new branch \x02b\u200Br\u200Ba\u200Bn\u200Bc\u200Bh\u200Bn\u200Ba\u200Bm\u200Be\x02 on \x02repo\x02'
      );
      assert.calledOnce(resStub);
    });

    it('Sends correct message for push event with single commit', async () => {
      await GitWebhook.handle(
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
        sendMessageStub.getCall(0),
        'testchannel',
        '\x02u\u200Bs\u200Be\u200Br\x02 pushed \x021\x02 commits to \x02b\u200Br\u200Ba\u200Bn\u200Bc\u200Bh\u200Bn\u200Ba\u200Bm\u200Be\x02 on \x02repo\x02:'
      );
      assert.calledWithExactly(
        sendMessageStub.getCall(1),
        'testchannel',
        ' * g\u200Bi\u200Bt\u200Bu\u200Bs\u200Be\u200Br: commit message (\x1fhttps://git.bogus/bffeb7422\x1f)'
      );
      assert.calledOnce(resStub);
    });

    it('Sends correct message for push event with multiple commits', async () => {
      await GitWebhook.handle(
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
        sendMessageStub.getCall(0),
        'testchannel',
        '\x02u\u200Bs\u200Be\u200Br\x02 pushed \x022\x02 commits to \x02b\u200Br\u200Ba\u200Bn\u200Bc\u200Bh\u200Bn\u200Ba\u200Bm\u200Be\x02 on \x02repo\x02:'
      );
      assert.calledWithExactly(
        sendMessageStub.getCall(1),
        'testchannel',
        ' * g\u200Bi\u200Bt\u200Bu\u200Bs\u200Be\u200Br: commit message (\x1fhttps://git.bogus/bffeb7422\x1f)'
      );
      assert.calledWithExactly(
        sendMessageStub.getCall(2),
        'testchannel',
        ' * g\u200Bi\u200Bt\u200Bu\u200Bs\u200Be\u200Br\u200B2: commit message2 (\x1fhttps://git.bogus/abfeb7422\x1f)'
      );
      assert.calledWithExactly(sendMessageStub.getCall(3), 'testchannel', 'Entire diff: \x1fhttps://git.bogus/fullcompare\x1f');
      assert.calledOnce(resStub);
    });
  });

  describe('verify', () => {
    let resStub: any;
    let reqStub: any;
    let nextStub: any;

    beforeEach(() => {
      resStub = {
        status: sandbox.stub(),
        send: sandbox.stub(),
      };
      resStub.status.returns(resStub);

      reqStub = {
        // Valid signature for body '{"some":"data"}' with key 'testingKey' using hmac sha256
        get: sandbox.stub().returns('4fd74acb4a18e709e5ee0b92566ca63b96013f6399f164e10bc0a4d6c7df810f'),
        body: Buffer.from('{"some":"data"}'),
      };
      nextStub = sandbox.stub();

      process.env.GIT_WEBHOOK = 'testingKey';
    });

    it('Returns 403 (no signature provided) if missing X-Gitea-Signature header', () => {
      reqStub.get.returns(undefined);
      GitWebhook.verify(reqStub, resStub, nextStub);
      assert.calledWithExactly(reqStub.get, 'X-Gitea-Signature');
      assert.calledWithExactly(resStub.status, 403);
      assert.calledWithExactly(resStub.send, { success: false, error: 'no signature provided' });
      assert.notCalled(nextStub);
    });

    it('Returns 403 (bad signature provided) when calculated hmacs mismatch', () => {
      reqStub.get.returns('deadbeefbadf4bcc6965cd0f46a0fd39f69e5cdb97206723e0ae5b3b74d8edbf');
      GitWebhook.verify(reqStub, resStub, nextStub);
      assert.calledWithExactly(resStub.status, 403);
      assert.calledWithExactly(resStub.send, { success: false, error: 'bad signature provided' });
      assert.notCalled(nextStub);
    });

    it('Parses body and calls next when valid signature', () => {
      GitWebhook.verify(reqStub, resStub, nextStub);
      expect(reqStub.body).to.deep.equal({ some: 'data' });
      assert.notCalled(resStub.status);
      assert.notCalled(resStub.send);
      assert.calledOnce(nextStub);
    });

    it('Returns 400 (invalid json) when body is invalid JSON', () => {
      reqStub.body = Buffer.from('not json');
      reqStub.get.returns('589a2ddddabcec9bc5e31256e80bd523a5be1dd91518b632a2ad4544e0818874');
      GitWebhook.verify(reqStub, resStub, nextStub);
      assert.calledWithExactly(resStub.status, 400);
      assert.calledWithExactly(resStub.send, { success: false, error: 'invalid json' });
      assert.notCalled(nextStub);
    });
  });
});
