import { expect } from 'chai';
import { createSandbox, SinonSandbox, SinonStub, assert } from 'sinon';
import { rawEchoSocketHandler, echoListen } from '../listeners/echo';
import net from 'net';
import { IRCClient } from '../clients/irc';

describe('NetworkEcho', () => {
  let sandbox: SinonSandbox;
  let ircMessageStub: SinonStub;

  beforeEach(() => {
    sandbox = createSandbox();
    sandbox.stub(IRCClient, 'message');
    ircMessageStub = IRCClient.message as any;
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('rawEchoSocketHandler', () => {
    it('will parse a raw echo over a network socket, and send to the appropriate channel', () => {
      const socket = new net.Socket({});
      rawEchoSocketHandler(socket);
      socket.emit('data', 'channel1|%|mytext');
      assert.calledWithExactly(ircMessageStub, '#channel1', 'mytext');
    });

    it('will send an emtpy message if not provided with a message', () => {
      const socket = new net.Socket({});
      rawEchoSocketHandler(socket);
      socket.emit('data', 'channel1|%|');
      assert.calledWithExactly(ircMessageStub, '#channel1', '');
    });

    it('will send the message to multiple channels if provided', () => {
      const socket = new net.Socket({});
      rawEchoSocketHandler(socket);
      socket.emit('data', 'channel1-channel2-channel3|%|hi');
      assert.calledThrice(ircMessageStub);
      expect(ircMessageStub.getCall(0).args).to.deep.equal(['#channel1', 'hi']);
      expect(ircMessageStub.getCall(1).args).to.deep.equal(['#channel2', 'hi']);
      expect(ircMessageStub.getCall(2).args).to.deep.equal(['#channel3', 'hi']);
    });
  });

  describe('echoListen', () => {
    let mockCreateServer: SinonStub;
    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      mockCreateServer = sandbox.stub(net, 'createServer').returns({ listen: () => {} } as any);
    });
    it('calls createServer with to start listening on the raw socket', () => {
      echoListen();
      assert.calledOnce(mockCreateServer);
    });
  });
});
