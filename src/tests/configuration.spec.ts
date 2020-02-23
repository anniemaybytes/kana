import { expect } from 'chai';
import fs from 'fs';
import { promisify } from 'util';
import mock from 'mock-fs';
import { createSandbox, SinonSandbox } from 'sinon';
import { getAllChannels, getChannel, saveChannels, deleteChannel } from '../clients/configuration';

const readFileAsync = promisify(fs.readFile).bind(fs);

describe('Configuration', () => {
  let sandbox: SinonSandbox;

  beforeEach(() => {
    sandbox = createSandbox();
    mock({
      'channels.json': '{"channel":{"persist":true,"join":"sajoin"}}'
    });
  });

  afterEach(() => {
    sandbox.restore();
    mock.restore();
  });

  describe('getAllChannels', () => {
    it('returns parsed data from filesystem read', async () => {
      expect(await getAllChannels()).to.deep.equal({ channel: { persist: true, join: 'sajoin' } });
    });

    it('sets default values for channels if not provided', async () => {
      mock({ 'channels.json': '{"channel":{}}' });
      expect(await getAllChannels()).to.deep.equal({ channel: { persist: false, join: 'auto' } });
    });
  });

  describe('getChannel', () => {
    it('returns valid data from channel config', async () => {
      expect(await getChannel('channel')).to.deep.equal({ persist: true, join: 'sajoin' });
    });

    it('throws NotFound error if channel is not in config', async () => {
      try {
        await getChannel('dne');
      } catch (e) {
        return expect(e.code).to.equal('NotFound');
      }
      return expect.fail('Did not throw');
    });
  });

  describe('saveChannels', () => {
    it('saves channel that was provided', async () => {
      mock({ 'channels.json': '{}' });
      const newChannel = { newChannel: { persist: true, join: 'auto' } } as any;
      await saveChannels(newChannel);
      expect(JSON.parse(await readFileAsync('channels.json', 'utf8'))).to.deep.equal(newChannel);
    });

    it('merges arguments with already saved channels', async () => {
      mock({ 'channels.json': '{"channel":{"persist":true,"join":"sajoin"}}' });
      await saveChannels({ newChannel: { persist: true, join: 'auto' } });
      const merged = { channel: { persist: true, join: 'sajoin' }, newChannel: { persist: true, join: 'auto' } };
      expect(JSON.parse(await readFileAsync('channels.json', 'utf8'))).to.deep.equal(merged);
    });
  });

  describe('deleteChannel', () => {
    it('deletes the specified channel from the configuration', async () => {
      await deleteChannel('channel');
      expect(JSON.parse(await readFileAsync('channels.json', 'utf8'))).to.deep.equal({});
    });
  });
});
