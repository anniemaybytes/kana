import { createSandbox, SinonSandbox, SinonStub, assert } from 'sinon';
import { expect } from 'chai';
import net from 'net';

import { Echo } from './echo.js';
import { IRCClient } from '../clients/irc.js';

describe('NetworkEcho', () => {
  let sandbox: SinonSandbox;
  let ircMessageStub: SinonStub;

  beforeEach(() => {
    sandbox = createSandbox();

    sandbox.stub(IRCClient, 'message');
    ircMessageStub = IRCClient.message as any;

    process.env.ECHO_SECRET = 'testingKey';
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('handle', () => {
    it('Will parse a raw echo over a network socket, and send to the appropriate channel', () => {
      const socket = new net.Socket({});
      Echo.handle(socket);
      socket.emit('data', 'testingKey|%|channel1|%|mytext');
      assert.calledWithExactly(ircMessageStub, '#channel1', 'mytext');
    });

    it('Will ignore request without proper authentication', () => {
      const socket = new net.Socket({});
      Echo.handle(socket);
      socket.emit('data', `wrongKey|%|channel1|%|sometext`);
      assert.notCalled(ircMessageStub);
    });

    it('Will ignore improperly formatted request', () => {
      const socket = new net.Socket({});
      Echo.handle(socket);
      socket.emit('data', `testingKey|%|`);
      assert.notCalled(ircMessageStub);
    });

    it('Will send an emtpy message if not provided with a message', () => {
      const socket = new net.Socket({});
      Echo.handle(socket);
      socket.emit('data', 'testingKey|%|channel1|%|');
      assert.calledWithExactly(ircMessageStub, '#channel1', '');
    });

    it('Will send the message to multiple channels if provided', () => {
      const socket = new net.Socket({});
      Echo.handle(socket);
      socket.emit('data', 'testingKey|%|channel1-channel2-channel3|%|hi');
      assert.calledThrice(ircMessageStub);
      expect(ircMessageStub.getCall(0).args).to.deep.equal(['#channel1', 'hi']);
      expect(ircMessageStub.getCall(1).args).to.deep.equal(['#channel2', 'hi']);
      expect(ircMessageStub.getCall(2).args).to.deep.equal(['#channel3', 'hi']);
    });
  });

  describe('start', () => {
    let mockCreateServer: SinonStub;
    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      mockCreateServer = sandbox.stub(net, 'createServer').returns({ listen: () => {} } as any);
    });
    it('Calls createServer with to start listening on the raw socket', () => {
      Echo.start();
      assert.calledOnce(mockCreateServer);
    });
  });
});
