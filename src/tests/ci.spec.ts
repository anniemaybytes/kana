import { createSandbox, SinonSandbox, SinonStub, assert } from 'sinon';
import { IRCClient } from '../clients/irc';
import { handleCIWebhook } from '../webhooks/ci';

describe('CI Webhook', () => {
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

  it('Does not send a message for non-build events', async () => {
    await handleCIWebhook({ body: { event: 'notABuild' } } as any, { send: resStub } as any, sandbox.stub() as any);
    assert.notCalled(stubSendMessage);
    assert.calledOnce(resStub);
  });

  it('Does not send a message if action is not created or updated', async () => {
    await handleCIWebhook(
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
    assert.notCalled(stubSendMessage);
    assert.calledOnce(resStub);
  });

  it('Does not send a message if updated status is not success, killed, failure, or error', async () => {
    await handleCIWebhook(
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
    assert.notCalled(stubSendMessage);
    assert.calledOnce(resStub);
  });

  it('Sends a completed message on update success', async () => {
    await handleCIWebhook(
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
      stubSendMessage,
      'testchannel',
      'CI: Build job #123 for \x02repo\x02 completed succesfully (\x1fhttps://git.bogus/repo/123\x1f)'
    );
    assert.calledOnce(resStub);
  });

  it('Sends a cancelled message on update killed', async () => {
    await handleCIWebhook(
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
      stubSendMessage,
      'testchannel',
      'CI: Build job #123 for \x02repo\x02 was cancelled (\x1fhttps://git.bogus/repo/123\x1f)'
    );
    assert.calledOnce(resStub);
  });

  it('Sends a failure message on update failure', async () => {
    await handleCIWebhook(
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
    assert.calledWithExactly(stubSendMessage, 'testchannel', 'CI: Build job #123 for \x02repo\x02 failed (\x1fhttps://git.bogus/repo/123\x1f)');
    assert.calledOnce(resStub);
  });

  it('Sends an error message on update error', async () => {
    await handleCIWebhook(
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
    assert.calledWithExactly(stubSendMessage, 'testchannel', 'CI: Build job #123 for \x02repo\x02 errored (\x1fhttps://git.bogus/repo/123\x1f)');
    assert.calledOnce(resStub);
  });

  it('Sends a created message with username on build create via user', async () => {
    await handleCIWebhook(
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
      stubSendMessage,
      'testchannel',
      'CI: Build job #123 by \x02u\u200Bs\u200Be\u200Br\x02 for \x02repo\x02 created (\x1fhttps://git.bogus/repo/123\x1f)'
    );
    assert.calledOnce(resStub);
  });

  it('Sends a created message with cron system on build create via cron', async () => {
    await handleCIWebhook(
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
      stubSendMessage,
      'testchannel',
      'CI: Build job #123 by \x02Cron system\x02 for \x02repo\x02 created (\x1fhttps://git.bogus/repo/123\x1f)'
    );
    assert.calledOnce(resStub);
  });

  it('Sends a created message with changes staged on build create by user with link and before', async () => {
    await handleCIWebhook(
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
      stubSendMessage.getCall(0),
      'testchannel',
      'CI: Build job #123 by \x02u\u200Bs\u200Be\u200Br\x02 for \x02repo\x02 created (\x1fhttps://git.bogus/repo/123\x1f)'
    );
    assert.calledWithExactly(stubSendMessage.getCall(1), 'testchannel', ' Changes staged: \x1fhttps://change-stage-url.whatever\x1f');
    assert.calledOnce(resStub);
  });
});
