import { expect } from 'chai';
import { createSandbox, SinonSandbox, SinonStub, assert } from 'sinon';
import * as link from '../commands/link';
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
      link.addLinkWatcher();
      assert.calledOnce(hookStub);
    });
  });

  describe('Link Found In Message', () => {
    let linkCallback: any;
    let eventReply: SinonStub;
    let gotStub: SinonStub;
    let fakeSocket: streamBuffers.ReadableStreamBuffer;
    beforeEach(() => {
      link.addLinkWatcher();
      linkCallback = hookStub.getCall(0).args[1];
      eventReply = sandbox.stub();
      fakeSocket = new streamBuffers.ReadableStreamBuffer();
      gotStub = sandbox.stub(link.got, 'stream').returns(fakeSocket as any);
    });

    it('Does not fetch or respond if a private message', async () => {
      await linkCallback({ privateMessage: true, message: 'http://duckduckgo.com', reply: eventReply });
      assert.notCalled(gotStub);
      assert.notCalled(eventReply);
    });

    it('Does not fetch or respond if it fails to match the regex', async () => {
      await linkCallback({ privateMessage: false, message: 'no urls', reply: eventReply });
      assert.notCalled(gotStub);
      assert.notCalled(eventReply);
    });

    it('Does not fetch or respond if the link matches ignore regexes', async () => {
      await linkCallback({ privateMessage: false, message: 'https://animebytes.tv', reply: eventReply });
      await linkCallback({ privateMessage: false, message: 'http://someurl.com/a.pdf', reply: eventReply });
      assert.notCalled(gotStub);
      assert.notCalled(eventReply);
    });

    it('Does not fetch or respond if there are more than 3 links in the message', async () => {
      await linkCallback({ privateMessage: false, message: 'http://a.com http://b.com http://c.com http://d.com', reply: eventReply });
      assert.notCalled(gotStub);
      assert.notCalled(eventReply);
    });

    it('Attempts to fetch the url of a good link', async () => {
      linkCallback({ privateMessage: false, message: 'https://some.cool.link', reply: eventReply });
      assert.calledOnce(gotStub);
      expect(gotStub.getCall(0).args[0]).to.equal('https://some.cool.link');
    });

    it('Fetches multiple links', async () => {
      linkCallback({ privateMessage: false, message: 'https://some.cool.link https://another.cool.link', reply: eventReply });
      assert.calledTwice(gotStub);
      const fetches = [gotStub.getCall(0).args[0], gotStub.getCall(1).args[0]];
      expect(fetches).to.include('https://some.cool.link');
      expect(fetches).to.include('https://another.cool.link');
    });

    it('Only fetches each good unique link once', async () => {
      linkCallback({ privateMessage: false, message: 'https://some.cool.link https://some.cool.link', reply: eventReply });
      assert.calledOnce(gotStub);
      expect(gotStub.getCall(0).args[0]).to.equal('https://some.cool.link');
    });

    it('Will not reply when response body stream emits an error', async () => {
      const promise = linkCallback({ privateMessage: false, message: 'https://some.cool.link', reply: eventReply });
      fakeSocket.emit('error', new Error());
      await promise;
      assert.called(gotStub);
      assert.notCalled(eventReply);
    });

    it('Will not reply when response status is not 2XX (is not ok)', async () => {
      const promise = linkCallback({ privateMessage: false, message: 'https://some.cool.link', reply: eventReply });
      fakeSocket.emit('response', { statusCode: 400, request: fakeSocket });
      await promise;
      assert.called(gotStub);
      assert.notCalled(eventReply);
    });

    it('Will not reply when response content-type header does not start with text/html', async () => {
      const promise = linkCallback({ privateMessage: false, message: 'https://some.cool.link', reply: eventReply });
      fakeSocket.emit('response', { statusCode: 200, headers: { 'content-type': 'application/json' }, request: fakeSocket });
      await promise;
      assert.called(gotStub);
      assert.notCalled(eventReply);
    });

    it('Will parse the fetch body socket for an html title tag', async () => {
      const promise = linkCallback({ privateMessage: false, message: 'https://some.cool.link', reply: eventReply });
      fakeSocket.emit('response', { statusCode: 200, headers: { 'content-type': 'text/html' }, request: fakeSocket });
      fakeSocket.put('<title>a title</title>');
      fakeSocket.stop();
      await promise;
      assert.calledWithExactly(eventReply, 'Link title: a title');
    });

    it('Will not output anything if a title tag cannot be found in the html', async () => {
      const promise = linkCallback({ privateMessage: false, message: 'https://some.cool.link', reply: eventReply });
      fakeSocket.emit('response', { statusCode: 200, headers: { 'content-type': 'text/html' }, request: fakeSocket });
      fakeSocket.put('<div>not a title</div>');
      fakeSocket.stop();
      await promise;
      assert.notCalled(eventReply);
    });

    it('Will truncate a title over 100 characters', async () => {
      const promise = linkCallback({ privateMessage: false, message: 'https://some.cool.link', reply: eventReply });
      fakeSocket.emit('response', { statusCode: 200, headers: { 'content-type': 'text/html' }, request: fakeSocket });
      fakeSocket.put(
        '<title>this is a veeery long title. Why would you put such a long title into your html? no one may ever know. Please do not do this</title>'
      );
      fakeSocket.stop();
      await promise;
      assert.calledWithExactly(
        eventReply,
        'Link title: this is a veeery long title. Why would you put such a long title into your html? no one may ever...'
      );
    });

    it('Will decode HTML entities inside title tag', async () => {
      const promise = linkCallback({ privateMessage: false, message: 'https://some.cool.link', reply: eventReply });
      fakeSocket.emit('response', { statusCode: 200, headers: { 'content-type': 'text/html' }, request: fakeSocket });
      fakeSocket.put('<title>my &quot;title&quot;</title>');
      fakeSocket.stop();
      await promise;
      assert.calledWithExactly(eventReply, 'Link title: my "title"');
    });
  });
});
