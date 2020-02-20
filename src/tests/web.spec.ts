import { expect } from 'chai';
import { createSandbox, SinonSandbox, SinonStub, assert } from 'sinon';
import * as nodeFetch from 'node-fetch';
import { addLinkWatcher } from '../commands/web';
import { IRCClient } from '../clients/irc';
import streamBuffers from 'stream-buffers';

describe('WebLinks', () => {
  let sandbox: SinonSandbox;
  let hookStub: SinonStub;

  beforeEach(() => {
    sandbox = createSandbox();
    hookStub = sandbox.stub(IRCClient, 'addMessageHook');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('addLinkWatcher', () => {
    it('Calls addMessageHook on the IRC bot', () => {
      addLinkWatcher();
      assert.calledOnce(hookStub);
    });
  });

  describe('Link Found In Message', () => {
    let linkCallback: any;
    let eventReply: SinonStub;
    let fetchStub: SinonStub;
    let fakeSocket: streamBuffers.ReadableStreamBuffer;
    beforeEach(() => {
      addLinkWatcher();
      linkCallback = hookStub.getCall(0).args[1];
      eventReply = sandbox.stub();
      fakeSocket = new streamBuffers.ReadableStreamBuffer();
      fetchStub = sandbox.stub(nodeFetch, 'default').resolves({
        ok: true,
        headers: { get: () => 'text/html' },
        body: fakeSocket
      } as any);
    });

    it('Does not respond if a private message', async () => {
      await linkCallback({ privateMessage: true, message: 'http://duckduckgo.com', reply: eventReply });
      assert.notCalled(eventReply);
    });

    it('Does not respond if it fails to match the regex', async () => {
      await linkCallback({ privateMessage: false, message: 'no urls', reply: eventReply });
      assert.notCalled(eventReply);
    });

    it('Does not respond if the link matches ignore regexes', async () => {
      await linkCallback({ privateMessage: false, message: 'http://127.0.0.1', reply: eventReply });
      await linkCallback({ privateMessage: false, message: 'http://animebytes.tv', reply: eventReply });
      await linkCallback({ privateMessage: false, message: 'http://someurl.com/a.pdf', reply: eventReply });
      assert.notCalled(eventReply);
    });

    it('Attempts to fetch the url of a good link', async () => {
      linkCallback({ privateMessage: false, message: 'https://some.cool.link', reply: eventReply });
      assert.called(fetchStub);
      expect(fetchStub.getCall(0).args[0]).to.equal('https://some.cool.link');
    });

    it('Will not reply when fetch throws an exception', async () => {
      fetchStub.throws(new Error());
      await linkCallback({ privateMessage: false, message: 'https://some.cool.link', reply: eventReply });
      assert.called(fetchStub);
      assert.notCalled(eventReply);
    });

    it('Will not reply when response status is not 2XX (is not ok)', async () => {
      fetchStub.resolves({ ok: false });
      await linkCallback({ privateMessage: false, message: 'https://some.cool.link', reply: eventReply });
      assert.called(fetchStub);
      assert.notCalled(eventReply);
    });

    it('Will not reply when response content-type header does not start with text/html', async () => {
      fetchStub.resolves({ ok: true, headers: { get: () => 'application/json' } });
      await linkCallback({ privateMessage: false, message: 'https://some.cool.link', reply: eventReply });
      assert.called(fetchStub);
      assert.notCalled(eventReply);
    });

    it('Will parse the fetch body socket for an html title tag', async () => {
      const promise = linkCallback({ privateMessage: false, message: 'https://some.cool.link', reply: eventReply });
      fakeSocket.put('<title>a title</title>');
      await promise;
      assert.calledWithExactly(eventReply, 'Link title: a title');
    });

    it('Will not output anything if a title tag cannot be found in the html', async () => {
      const promise = linkCallback({ privateMessage: false, message: 'https://some.cool.link', reply: eventReply });
      fakeSocket.put('<div>not a title</div>');
      fakeSocket.stop();
      await promise;
      assert.notCalled(eventReply);
    });

    it('Will truncate a title over 100 characters', async () => {
      const promise = linkCallback({ privateMessage: false, message: 'https://some.cool.link', reply: eventReply });
      fakeSocket.put(
        '<title>this is a veeery long title. Why would you put such a long title into your html? no one may ever know. Please do not do this</title>'
      );
      await promise;
      assert.calledWithExactly(
        eventReply,
        'Link title: this is a veeery long title. Why would you put such a long title into your html? no one may ever...'
      );
    });
  });
});
