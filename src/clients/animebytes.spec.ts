import { expect } from 'chai';
import { createSandbox, SinonSandbox, SinonStub, assert } from 'sinon';

import { ABClient } from './animebytes.js';

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

    it('Should call makeRequest with the correct path', async () => {
      await ABClient.postStats({});
      assert.calledOnce(makeRequestStub);
      expect(makeRequestStub.getCall(0).args[0]).to.equal('/api/irc/notifier');
    });

    it('Should call makeRequest with the correct converted body', async () => {
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

    it('Should call makeRequest with the correct path', async () => {
      await ABClient.authUserForRooms('username', 'key', ['room1', 'room2']);
      assert.calledOnce(makeRequestStub);
      expect(makeRequestStub.getCall(0).args[0]).to.equal('/api/irc/auth_user');
    });

    it('Should call makeRequest with the correct converted body', async () => {
      await ABClient.authUserForRooms('username', 'key', ['room1', 'room2']);
      assert.calledOnce(makeRequestStub);
      expect(makeRequestStub.getCall(0).args[1]).to.deep.equal({ username: 'username', key: 'key', channels: ['room1', 'room2'] });
    });

    it('Should return the result of makeRequest', async () => {
      expect(await ABClient.authUserForRooms('username', 'key', ['room1', 'room2'])).to.equal('stubbedValue');
    });
  });

  describe('getUserInfo', () => {
    let makeRequestStub: SinonStub;
    beforeEach(() => {
      sandbox.stub(ABClient, 'makeRequest').resolves({ message: 'stubbedValue', success: true });
      makeRequestStub = ABClient.makeRequest as SinonStub;
    });

    it('Should call makeRequest with the correct path', async () => {
      await ABClient.getUserInfo('username');
      assert.calledOnce(makeRequestStub);
      expect(makeRequestStub.getCall(0).args[0]).to.equal('/api/irc/user_info');
    });

    it('Should call makeRequest with the correct converted body', async () => {
      await ABClient.getUserInfo('username');
      assert.calledOnce(makeRequestStub);
      expect(makeRequestStub.getCall(0).args[1]).to.deep.equal({
        username: 'username',
      });
    });

    it('Should throw NotFound if success is false', async () => {
      makeRequestStub.resolves({ success: false });
      try {
        await ABClient.getUserInfo('username');
      } catch (e) {
        return expect(e.code).to.equal('NotFound');
      }
      return expect.fail('Code did not throw');
    });

    it('Should return the message from the result of makeRequest', async () => {
      expect(await ABClient.getUserInfo('username')).to.equal('stubbedValue');
    });
  });

  describe('makeRequest', () => {
    let gotStub: SinonStub;
    beforeEach(() => {
      sandbox.stub(ABClient, 'got').resolves({
        statusCode: 200,
        body: '{"stubbed":"data"}',
      } as any);
      gotStub = ABClient.got as unknown as SinonStub;
    });

    it('Creates and calls fetch with correct url combining host and path', async () => {
      await ABClient.makeRequest('/myPath', {});
      assert.calledOnce(gotStub);
      expect(gotStub.getCall(0).args[0]).to.equal(`${ABClient.url}/myPath`);
    });

    it('Adds authKey to query string when authenticated is true', async () => {
      const myBody: any = { testing: 'true' };
      await ABClient.makeRequest('/myPath', myBody);
      assert.calledOnce(gotStub);
      expect(gotStub.getCall(0).args[1].searchParams.authKey).to.equal(ABClient.siteApiKey);
    });

    it('Does not add authKey to body when authenticated is false', async () => {
      const myBody: any = { testing: 'true' };
      await ABClient.makeRequest('/myPath', myBody, false);
      assert.calledOnce(gotStub);
      expect(gotStub.getCall(0).args[1].json.authKey).to.be.undefined;
    });

    it('Calls fetch with the correct options', async () => {
      await ABClient.makeRequest('/myPath', {});
      assert.calledOnce(gotStub);
      expect(gotStub.getCall(0).args[1].method).to.equal('POST');
      expect(gotStub.getCall(0).args[1].json).to.not.be.undefined;
    });

    it('Throws an exception if resulting status is not OK', async () => {
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

    it('Returns parsed json if the return body was JSON', async () => {
      expect(await ABClient.makeRequest('/myPath', {})).to.deep.equal({
        stubbed: 'data',
      });
    });

    it('Returns the raw body string if the return body was not JSON', async () => {
      gotStub.resolves({
        statusCode: 200,
        body: 'stubbed',
      });
      expect(await ABClient.makeRequest('/myPath', {})).to.equal('stubbed');
    });
  });
});
