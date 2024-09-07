import { createSandbox, SinonSandbox, SinonStub, assert } from 'sinon';
import { expect } from 'chai';

import { Stats } from './stats.js';
import { IRCClient } from '../clients/irc.js';
import { ABClient } from '../clients/animebytes.js';

describe('StatsCollector', () => {
  let sandbox: SinonSandbox;
  let ircWhoStub: SinonStub;
  let ABStub: SinonStub;
  let clock: any;

  beforeEach(() => {
    sandbox = createSandbox();

    sandbox.stub(IRCClient, 'who').resolves([
      { hostname: 'user.class.AnimeBytes', ident: '1234' },
      { hostname: 'invalid', ident: '4321' },
    ] as any);
    ircWhoStub = IRCClient.who as any;

    sandbox.stub(ABClient, 'postStats');
    ABStub = ABClient.postStats as any;

    clock = sandbox.useFakeTimers(new Date('2020-02-19T00:00:00.000Z'));
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('update', async () => {
    it('Sets valid users time delta to 300 seconds', async () => {
      await Stats.update();
      assert.calledOnce(ircWhoStub);
      assert.calledOnce(ABStub);
      expect(ABStub.getCall(0).args[0]['1234']?.deltaTime).to.be.equal(300);
    });

    it('Does not post stats if an error occurred', async () => {
      ircWhoStub.throws(new Error());
      await Stats.update();
      assert.notCalled(ABStub);
    });
  });

  describe('start', () => {
    it('Calls setInterval with updateStats to schedule repeated execution', () => {
      Stats.start();
      clock.tick(300001);
      assert.calledOnce(ircWhoStub);
    });
  });
});
