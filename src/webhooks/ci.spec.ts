import { createSandbox, SinonSandbox, SinonStub, assert } from 'sinon';

import { IRCClient } from '../clients/irc.js';
import { CIWebhook } from './ci.js';

describe('CIHook', () => {
  let sandbox: SinonSandbox;

  beforeEach(() => {
    sandbox = createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('handle', () => {
    let sendMessageStub: SinonStub;
    let resStub: SinonStub;

    beforeEach(() => {
      sendMessageStub = sandbox.stub(IRCClient, 'message');
      resStub = sandbox.stub();

      process.env.GIT_CHANNEL = 'testchannel';
    });

    it('Does not send a message for non-build events', async () => {
      await CIWebhook.handle({ body: { event: 'notABuild' } } as any, { send: resStub } as any, sandbox.stub() as any);
      assert.notCalled(sendMessageStub);
      assert.calledOnce(resStub);
    });

    it('Does not send a message if action is not created or updated', async () => {
      await CIWebhook.handle(
        {
          body: {
            event: 'build',
            action: 'bogus',
            system: { link: 'https://git.bogus' },
            repo: { slug: 'repo' },
            build: { number: 123 },
          },
        } as any,
        { send: resStub } as any,
        sandbox.stub() as any
      );
      assert.notCalled(sendMessageStub);
      assert.calledOnce(resStub);
    });

    it('Does not send a message if updated status is not success, killed, failure, or error', async () => {
      await CIWebhook.handle(
        {
          body: {
            event: 'build',
            action: 'updated',
            system: { link: 'https://git.bogus' },
            repo: { slug: 'repo' },
            build: { number: 123, status: 'bogus' },
          },
        } as any,
        { send: resStub } as any,
        sandbox.stub() as any
      );
      assert.notCalled(sendMessageStub);
      assert.calledOnce(resStub);
    });

    it('Sends a completed message on update success', async () => {
      await CIWebhook.handle(
        {
          body: {
            event: 'build',
            action: 'updated',
            system: { link: 'https://git.bogus' },
            repo: { slug: 'repo' },
            build: { number: 123, status: 'success' },
          },
        } as any,
        { send: resStub } as any,
        sandbox.stub() as any
      );
      assert.calledWithExactly(
        sendMessageStub,
        'testchannel',
        'CI: Build job #123 for \x02repo\x02 completed succesfully (\x1fhttps://git.bogus/repo/123\x1f)'
      );
      assert.calledOnce(resStub);
    });

    it('Sends a cancelled message on update killed', async () => {
      await CIWebhook.handle(
        {
          body: {
            event: 'build',
            action: 'updated',
            system: { link: 'https://git.bogus' },
            repo: { slug: 'repo' },
            build: { number: 123, status: 'killed' },
          },
        } as any,
        { send: resStub } as any,
        sandbox.stub() as any
      );
      assert.calledWithExactly(
        sendMessageStub,
        'testchannel',
        'CI: Build job #123 for \x02repo\x02 was cancelled (\x1fhttps://git.bogus/repo/123\x1f)'
      );
      assert.calledOnce(resStub);
    });

    it('Sends a failure message on update failure', async () => {
      await CIWebhook.handle(
        {
          body: {
            event: 'build',
            action: 'updated',
            system: { link: 'https://git.bogus' },
            repo: { slug: 'repo' },
            build: { number: 123, status: 'failure' },
          },
        } as any,
        { send: resStub } as any,
        sandbox.stub() as any
      );
      assert.calledWithExactly(sendMessageStub, 'testchannel', 'CI: Build job #123 for \x02repo\x02 failed (\x1fhttps://git.bogus/repo/123\x1f)');
      assert.calledOnce(resStub);
    });

    it('Sends an error message on update error', async () => {
      await CIWebhook.handle(
        {
          body: {
            event: 'build',
            action: 'updated',
            system: { link: 'https://git.bogus' },
            repo: { slug: 'repo' },
            build: { number: 123, status: 'error' },
          },
        } as any,
        { send: resStub } as any,
        sandbox.stub() as any
      );
      assert.calledWithExactly(sendMessageStub, 'testchannel', 'CI: Build job #123 for \x02repo\x02 errored (\x1fhttps://git.bogus/repo/123\x1f)');
      assert.calledOnce(resStub);
    });

    it('Sends a created message with username on build created by user', async () => {
      await CIWebhook.handle(
        {
          body: {
            event: 'build',
            action: 'created',
            system: { link: 'https://git.bogus' },
            repo: { slug: 'repo' },
            build: { number: 123, trigger: 'whatever', author_login: 'user' },
          },
        } as any,
        { send: resStub } as any,
        sandbox.stub() as any
      );
      assert.calledWithExactly(
        sendMessageStub,
        'testchannel',
        'CI: Build job #123 by \x02u\u200Bs\u200Be\u200Br\x02 for \x02repo\x02 created (\x1fhttps://git.bogus/repo/123\x1f)'
      );
      assert.calledOnce(resStub);
    });

    it('Sends a created message with cron system on build created via cron', async () => {
      await CIWebhook.handle(
        {
          body: {
            event: 'build',
            action: 'created',
            system: { link: 'https://git.bogus' },
            repo: { slug: 'repo' },
            build: { number: 123, trigger: '@cron' },
          },
        } as any,
        { send: resStub } as any,
        sandbox.stub() as any
      );
      assert.calledWithExactly(
        sendMessageStub,
        'testchannel',
        'CI: Build job #123 by \x02Cron system\x02 for \x02repo\x02 created (\x1fhttps://git.bogus/repo/123\x1f)'
      );
      assert.calledOnce(resStub);
    });

    it('Sends a created message with changes staged on build created by user with link and before', async () => {
      await CIWebhook.handle(
        {
          body: {
            event: 'build',
            action: 'created',
            system: { link: 'https://git.bogus' },
            repo: { slug: 'repo' },
            build: { number: 123, trigger: 'whatever', before: '123', author_login: 'user', link: 'https://change-stage-url.whatever' },
          },
        } as any,
        { send: resStub } as any,
        sandbox.stub() as any
      );
      assert.calledWithExactly(
        sendMessageStub.getCall(0),
        'testchannel',
        'CI: Build job #123 by \x02u\u200Bs\u200Be\u200Br\x02 for \x02repo\x02 created (\x1fhttps://git.bogus/repo/123\x1f)'
      );
      assert.calledWithExactly(sendMessageStub.getCall(1), 'testchannel', ' Changes staged: \x1fhttps://change-stage-url.whatever\x1f');
      assert.calledOnce(resStub);
    });
  });

  describe('verify', () => {
    let mockHttpSignature: any;
    let resStub: any;
    let reqStub: any;
    let nextStub: any;

    beforeEach(() => {
      resStub = {
        status: sandbox.stub(),
        send: sandbox.stub(),
      };
      resStub.status.returns(resStub);

      reqStub = sandbox.stub();
      nextStub = sandbox.stub();

      mockHttpSignature = {
        parseRequest: sandbox.stub().returns('thing'),
        verifyHMAC: sandbox.stub().returns(true),
      };

      process.env.GIT_WEBHOOK = 'testingKey';
    });

    it('Calls next function with valid signature', () => {
      CIWebhook.verify(reqStub, resStub, nextStub, mockHttpSignature);
      assert.calledOnce(nextStub);
    });

    it('Sends a 403 (bad signature provided) on invalid signature', () => {
      mockHttpSignature.verifyHMAC.returns(false);
      CIWebhook.verify(reqStub, resStub, nextStub, mockHttpSignature);
      assert.calledWithExactly(resStub.status, 403);
      assert.calledWithExactly(resStub.send, { success: false, error: 'bad signature provided' });
      assert.notCalled(nextStub);
    });
  });
});
