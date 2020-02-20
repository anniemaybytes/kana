import { createSandbox, SinonSandbox, SinonStub, assert } from 'sinon';
import proxyquire from 'proxyquire';

describe('WebhookServer', () => {
  let sandbox: SinonSandbox;
  let mockExpress: SinonStub;
  let startWebhookServer: any;

  beforeEach(() => {
    sandbox = createSandbox();
    mockExpress = sandbox.stub().returns({
      use: sandbox.stub(),
      post: sandbox.stub(),
      listen: sandbox.stub()
    });
    startWebhookServer = proxyquire('../listeners/webhook', {
      express: mockExpress
    }).startWebhookServer;
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('startWebhookServer', () => {
    it('creates and starts an express app when called', () => {
      startWebhookServer();
      assert.calledOnce(mockExpress);
      assert.calledOnce(mockExpress.returnValues[0].use);
      assert.calledOnce(mockExpress.returnValues[0].listen);
    });

    it("doesn't create post routes if GIT_WEBHOOK is not provided", () => {
      process.env.GIT_WEBHOOK = '';
      startWebhookServer();
      assert.notCalled(mockExpress.returnValues[0].post);
    });

    it('does create post routes when GIT_WEBHOOK is provided', () => {
      process.env.GIT_WEBHOOK = 'defined';
      startWebhookServer();
      assert.called(mockExpress.returnValues[0].post);
    });
  });
});
