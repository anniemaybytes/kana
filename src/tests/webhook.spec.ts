import { expect } from 'chai';
import { createSandbox, SinonSandbox, SinonStub, assert } from 'sinon';
import proxyquire from 'proxyquire';
import { verifyGiteaSig } from '../listeners/webhook';

describe('WebhookServer', () => {
  let sandbox: SinonSandbox;

  beforeEach(() => {
    sandbox = createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('verifyGiteaSig', () => {
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

    it('returns 403 no signature provided if missing X-Gitea-Signature header', () => {
      reqStub.get.returns(undefined);
      verifyGiteaSig(reqStub, resStub, nextStub);
      assert.calledWithExactly(reqStub.get, 'X-Gitea-Signature');
      assert.calledWithExactly(resStub.status, 403);
      assert.calledWithExactly(resStub.send, { error: 'No signature provided' });
      assert.notCalled(nextStub);
    });

    it('returns 403 bad signature provided when calculated hmacs mismatch', () => {
      reqStub.get.returns('deadbeefbadf4bcc6965cd0f46a0fd39f69e5cdb97206723e0ae5b3b74d8edbf');
      verifyGiteaSig(reqStub, resStub, nextStub);
      assert.calledWithExactly(resStub.status, 403);
      assert.calledWithExactly(resStub.send, { error: 'Bad signature provided' });
      assert.notCalled(nextStub);
    });

    it('parses body and calls next when valid signature', () => {
      verifyGiteaSig(reqStub, resStub, nextStub);
      expect(reqStub.body).to.deep.equal({ some: 'data' });
      assert.notCalled(resStub.status);
      assert.notCalled(resStub.send);
      assert.calledOnce(nextStub);
    });

    it('returns 400 Invalid JSON when body is invalid JSON', () => {
      reqStub.body = Buffer.from('not json');
      reqStub.get.returns('589a2ddddabcec9bc5e31256e80bd523a5be1dd91518b632a2ad4544e0818874');
      verifyGiteaSig(reqStub, resStub, nextStub);
      assert.calledWithExactly(resStub.status, 400);
      assert.calledWithExactly(resStub.send, 'Invalid JSON');
      assert.notCalled(nextStub);
    });
  });

  describe('verifyDroneSig', () => {
    let verifyDroneSig: any;
    let mockHttpSignature: any;
    let resStub: any;
    let reqStub: SinonStub;
    let nextStub: SinonStub;

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
      verifyDroneSig = proxyquire('../listeners/webhook', {
        'http-signature': mockHttpSignature,
      }).verifyDroneSig;

      process.env.GIT_WEBHOOK = 'testingKey';
    });

    it('Calls next function with valid signature', () => {
      verifyDroneSig(reqStub, resStub, nextStub);
      assert.calledOnce(nextStub);
    });

    it('Sends a 403 bad signature on invalid signature', () => {
      mockHttpSignature.verifyHMAC.returns(false);
      verifyDroneSig(reqStub, resStub, nextStub);
      assert.calledWithExactly(resStub.status, 403);
      assert.calledWithExactly(resStub.send, { error: 'Bad signature provided' });
      assert.notCalled(nextStub);
    });
  });

  describe('startWebhookServer', () => {
    let mockExpress: SinonStub;
    let startWebhookServer: any;

    beforeEach(() => {
      mockExpress = sandbox.stub().returns({
        use: sandbox.stub(),
        post: sandbox.stub(),
        listen: sandbox.stub(),
      });
      startWebhookServer = proxyquire('../listeners/webhook', {
        express: mockExpress,
      }).startWebhookServer;
    });

    it('creates and starts an express app when called', () => {
      startWebhookServer();
      assert.calledOnce(mockExpress);
      assert.calledOnce(mockExpress.returnValues[0].listen);
    });
  });
});
