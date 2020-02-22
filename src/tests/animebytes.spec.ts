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
        username: 'username'
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
      sandbox.stub(ABClient, 'makeRequest').resolves({ message: 'stubbedValue' });
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
        username: 'username'
      });
    });

    it('should return the message from the result of makeRequest', async () => {
      expect(await ABClient.performDess('username')).to.equal('stubbedValue');
    });
  });

  describe('makeRequest', () => {
    let fetchStub: SinonStub;
    beforeEach(() => {
      sandbox.stub(ABClient, 'fetch').resolves({
        ok: true,
        status: 200,
        text: async () => '{"stubbed":"data"}'
      } as any);
      fetchStub = (ABClient.fetch as unknown) as SinonStub;
    });

    it('creates and calls fetch with correct url combining host and path', async () => {
      await ABClient.makeRequest('/myPath', {});
      assert.calledOnce(fetchStub);
      expect(fetchStub.getCall(0).args[0]).to.equal(`${ABClient.url}/myPath`);
    });

    it('adds authKey to body when authenticated is true', async () => {
      const myBody: any = { testing: 'true' };
      await ABClient.makeRequest('/myPath', myBody);
      expect(myBody.authKey).to.equal(ABClient.siteApiKey);
      assert.calledOnce(fetchStub);
      expect(fetchStub.getCall(0).args[1].body).to.equal(JSON.stringify(myBody));
    });

    it('does not add authKey to body when authenticated is false', async () => {
      const myBody: any = { testing: 'true' };
      await ABClient.makeRequest('/myPath', myBody, false);
      expect(myBody.authKey).to.be.undefined;
      assert.calledOnce(fetchStub);
      expect(fetchStub.getCall(0).args[1].body).to.equal(JSON.stringify(myBody));
    });

    it('calls fetch with the correct options', async () => {
      await ABClient.makeRequest('/myPath', {});
      assert.calledOnce(fetchStub);
      expect(fetchStub.getCall(0).args[1].method).to.equal('POST');
      expect(fetchStub.getCall(0).args[1].headers).to.deep.equal({ 'Content-Type': 'application/json' });
      expect(fetchStub.getCall(0).args[1].body).to.not.be.undefined;
    });

    it('throws an exception if resulting status is not ok', async () => {
      fetchStub.resolves({
        ok: false,
        status: 200,
        text: async () => '{"stubbed":"data"}'
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
        stubbed: 'data'
      });
    });

    it('returns the raw body string if the return body was not JSON', async () => {
      fetchStub.resolves({
        ok: true,
        status: 200,
        text: async () => 'stubbed'
      });
      expect(await ABClient.makeRequest('/myPath', {})).to.equal('stubbed');
    });
  });
});
