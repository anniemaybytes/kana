import { expect } from 'chai';
import { createSandbox, SinonSandbox, SinonStub, assert } from 'sinon';
import { updateStats, scheduleStatsReporter } from '../cron/stats';
import { IRCClient } from '../clients/irc';
import { ABClient } from '../clients/animebytes';

describe('StatsCollector', () => {
  let sandbox: SinonSandbox;
  let ircWhoStub: SinonStub;
  let ABStub: SinonStub;
  let clock: any;

  beforeEach(() => {
    sandbox = createSandbox();
    sandbox.stub(IRCClient, 'who').resolves([
      { hostname: 'a.b.AnimeBytes', ident: '1234' },
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

  describe('updateStats', async () => {
    it('sets valid users time delta to 300 seconds', async () => {
      await updateStats();
      assert.calledOnce(ircWhoStub);
      assert.calledOnce(ABStub);
      expect(ABStub.getCall(0).args[0]['1234']?.delta_time).to.be.equal(300);
    });

    it('does not post stats if an error occurred', async () => {
      ircWhoStub.throws('error');
      await updateStats();
      assert.notCalled(ABStub);
    });
  });

  describe('scheduleStatsReporter', () => {
    it('calls setInterval with updateStats to schedule repeated execution', () => {
      scheduleStatsReporter();
      clock.tick(300001);
      assert.calledOnce(ircWhoStub);
    });
  });
});
