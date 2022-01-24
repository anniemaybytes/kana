import { createSandbox, SinonSandbox, SinonStub, assert } from 'sinon';

import { Webhook } from './webhook.js';

describe('WebhookServer', () => {
  let sandbox: SinonSandbox;

  beforeEach(() => {
    sandbox = createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('start', () => {
    let mockExpress: SinonStub;

    beforeEach(() => {
      mockExpress = sandbox.stub().returns({
        use: sandbox.stub(),
        post: sandbox.stub(),
        listen: sandbox.stub(),
      });
    });

    it('Creates and starts an express app when called', () => {
      Webhook.start(mockExpress);
      assert.calledOnce(mockExpress);
      assert.calledOnce(mockExpress.returnValues[0].listen);
    });
  });
});
