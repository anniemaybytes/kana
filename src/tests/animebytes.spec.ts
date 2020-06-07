import { expect } from 'chai';
import { createSandbox, SinonSandbox, SinonStub, assert } from 'sinon';
import { ABClient } from '../clients/animebytes';

describe('ABClient', () => {
  let sandbox: SinonSandbox;

  beforeEach(() => {
    sandbox = createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('postStats', () => {
    let makeRequestStub: SinonStub;
    beforeEach(() => {
      sandbox.stub(ABClient, 'makeRequest');
      makeRequestStub = ABClient.makeRequest as SinonStub;
    });

    it('should call makeRequest with the correct path', async () => {
      await ABClient.postStats({});
      assert.calledOnce(makeRequestStub);
      expect(makeRequestStub.getCall(0).args[0]).to.equal('/api/irc/notifier');
    });

    it('should call makeRequest with the correct converted body', async () => {
      const params = { testUser: { delta_time: 123 } };
      await ABClient.postStats(params);
      assert.calledOnce(makeRequestStub);
      expect(makeRequestStub.getCall(0).args[1]).to.deep.equal({ stats: params });
    });
  });

  describe('authUserForRooms', () => {
    let makeRequestStub: SinonStub;
    beforeEach(() => {
      sandbox.stub(ABClient, 'makeRequest').resolves('stubbedValue');
      makeRequestStub = ABClient.makeRequest as SinonStub;
    });

    it('should call makeRequest with the correct path', async () => {
      await ABClient.authUserForRooms('username', 'key', ['room1', 'room2']);
      assert.calledOnce(makeRequestStub);
      expect(makeRequestStub.getCall(0).args[0]).to.equal('/api/irc/auth_user');
    });

    it('should call makeRequest with the correct converted body', async () => {
      await ABClient.authUserForRooms('username', 'key', ['room1', 'room2']);
      assert.calledOnce(makeRequestStub);
      expect(makeRequestStub.getCall(0).args[1]).to.deep.equal({ username: 'username', key: 'key', channels: ['room1', 'room2'] });
    });

    it('should return the result of makeRequest', async () => {
      expect(await ABClient.authUserForRooms('username', 'key', ['room1', 'room2'])).to.equal('stubbedValue');
    });
  });

  describe('getUserInfo', () => {
    let makeRequestStub: SinonStub;
    beforeEach(() => {
      sandbox.stub(ABClient, 'makeRequest').resolves({ message: 'stubbedValue', success: true });
      makeRequestStub = ABClient.makeRequest as SinonStub;
    });

    it('should call makeRequest with the correct path', async () => {
      await ABClient.getUserInfo('username');
      assert.calledOnce(makeRequestStub);
      expect(makeRequestStub.getCall(0).args[0]).to.equal('/api/irc/user_info');
    });

    it('should call makeRequest with the correct converted body', async () => {
      await ABClient.getUserInfo('username');
      assert.calledOnce(makeRequestStub);
      expect(makeRequestStub.getCall(0).args[1]).to.deep.equal({
        username: 'username',
      });
    });

    it('should throw NotFound if success is false', async () => {
      makeRequestStub.resolves({ success: false });
      try {
        await ABClient.getUserInfo('username');
      } catch (e) {
        return expect(e.code).to.equal('NotFound');
      }
      return expect.fail('Code did not throw');
    });

    it('should return the message from the result of makeRequest', async () => {
      expect(await ABClient.getUserInfo('username')).to.equal('stubbedValue');
    });
  });

  describe('performDess', () => {
    let makeRequestStub: SinonStub;
    beforeEach(() => {
      sandbox.stub(ABClient, 'makeRequest').resolves({ success: true, message: 'stubbedValue' });
      makeRequestStub = ABClient.makeRequest as SinonStub;
    });

    it('should call makeRequest with the correct path', async () => {
      await ABClient.performDess('username');
      assert.calledOnce(makeRequestStub);
      expect(makeRequestStub.getCall(0).args[0]).to.equal('/api/irc/dess_tax');
    });

    it('should call makeRequest with the correct converted body', async () => {
      await ABClient.performDess('username');
      assert.calledOnce(makeRequestStub);
      expect(makeRequestStub.getCall(0).args[1]).to.deep.equal({
        username: 'username',
      });
    });

    it('should return the message from the result of makeRequest', async () => {
      expect(await ABClient.performDess('username')).to.equal('stubbedValue');
    });

    it('should throw if response body success is false', async () => {
      makeRequestStub.resolves({ success: false });
      try {
        await ABClient.performDess('username');
        expect.fail('did not throw');
      } catch (e) {} // eslint-disable-line no-empty
    });
  });

  describe('makeRequest', () => {
    let gotStub: SinonStub;
    beforeEach(() => {
      sandbox.stub(ABClient, 'got').resolves({
        statusCode: 200,
        body: '{"stubbed":"data"}',
      } as any);
      gotStub = (ABClient.got as unknown) as SinonStub;
    });

    it('creates and calls fetch with correct url combining host and path', async () => {
      await ABClient.makeRequest('/myPath', {});
      assert.calledOnce(gotStub);
      expect(gotStub.getCall(0).args[0]).to.equal(`${ABClient.url}/myPath`);
    });

    it('adds authKey to body when authenticated is true', async () => {
      const myBody: any = { testing: 'true' };
      await ABClient.makeRequest('/myPath', myBody);
      assert.calledOnce(gotStub);
      expect(gotStub.getCall(0).args[1].json.authKey).to.equal(ABClient.siteApiKey);
    });

    it('does not add authKey to body when authenticated is false', async () => {
      const myBody: any = { testing: 'true' };
      await ABClient.makeRequest('/myPath', myBody, false);
      assert.calledOnce(gotStub);
      expect(gotStub.getCall(0).args[1].json.authKey).to.be.undefined;
    });

    it('calls fetch with the correct options', async () => {
      await ABClient.makeRequest('/myPath', {});
      assert.calledOnce(gotStub);
      expect(gotStub.getCall(0).args[1].method).to.equal('POST');
      expect(gotStub.getCall(0).args[1].json).to.not.be.undefined;
    });

    it('throws an exception if resulting status is not ok', async () => {
      gotStub.resolves({
        statusCode: 500,
        body: '{"stubbed":"data"}',
      });
      try {
        await ABClient.makeRequest('/myPath', {});
      } catch (e) {
        return;
      }
      expect.fail('Did not throw');
    });

    it('returns parsed json if the return body was JSON', async () => {
      expect(await ABClient.makeRequest('/myPath', {})).to.deep.equal({
        stubbed: 'data',
      });
    });

    it('returns the raw body string if the return body was not JSON', async () => {
      gotStub.resolves({
        statusCode: 200,
        body: 'stubbed',
      });
      expect(await ABClient.makeRequest('/myPath', {})).to.equal('stubbed');
    });
  });
});
