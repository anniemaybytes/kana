import { createSandbox, SinonSandbox } from 'sinon';
import fs from 'fs';
import mock from 'mock-fs';
import { expect } from 'chai';
import { promisify } from 'util';

import { Configuration } from '../clients/configuration.js';

const readFileAsync = promisify(fs.readFile).bind(fs);

describe('Configuration', () => {
  let sandbox: SinonSandbox;

  beforeEach(() => {
    sandbox = createSandbox();

    mock({
      'channels.json': '{"channel":{"persist":true,"join":"sajoin"}}',
    });
  });

  afterEach(() => {
    sandbox.restore();
    mock.restore();
  });

  describe('getAllChannels', () => {
    it('Returns parsed data from filesystem read', async () => {
      expect(await Configuration.getAllChannels()).to.deep.equal({ channel: { persist: true, join: 'sajoin' } });
    });

    it('Sets default values for channels if not provided', async () => {
      mock({ 'channels.json': '{"channel":{}}' });
      expect(await Configuration.getAllChannels()).to.deep.equal({ channel: { persist: false, join: 'auto' } });
    });

    it('Writes and uses default empty config if channels.json does not exist', async () => {
      mock({});
      expect(await Configuration.getAllChannels()).to.deep.equal({});
      expect(await readFileAsync('channels.json', 'utf8')).to.equal('{}');
    });

    it('Throws on unexpected file error', async () => {
      mock({
        'channels.json': mock.file({
          mode: 0o000, // For emulating permission error
        }),
      });
      try {
        await Configuration.getAllChannels();
        expect.fail('did not throw');
      } catch (e) {} // eslint-disable-line no-empty
    });
  });

  describe('getChannel', () => {
    it('Returns valid data from channel config', async () => {
      expect(await Configuration.getChannel('channel')).to.deep.equal({ persist: true, join: 'sajoin' });
    });

    it('Throws NotFound error if channel is not in config', async () => {
      try {
        await Configuration.getChannel('dne');
      } catch (e) {
        return expect(e.code).to.equal('NotFound');
      }
      return expect.fail('Did not throw');
    });
  });

  describe('saveChannels', () => {
    it('Saves channel that was provided', async () => {
      mock({ 'channels.json': '{}' });
      const newChannel = { newChannel: { persist: true, join: 'auto' } } as any;
      await Configuration.saveChannels(newChannel);
      expect(JSON.parse(await readFileAsync('channels.json', 'utf8'))).to.deep.equal(newChannel);
    });

    it('Merges arguments with already saved channels', async () => {
      mock({ 'channels.json': '{"channel":{"persist":true,"join":"sajoin"}}' });
      await Configuration.saveChannels({ newChannel: { persist: true, join: 'auto' } });
      const merged = { channel: { persist: true, join: 'sajoin' }, newChannel: { persist: true, join: 'auto' } };
      expect(JSON.parse(await readFileAsync('channels.json', 'utf8'))).to.deep.equal(merged);
    });
  });

  describe('deleteChannel', () => {
    it('Deletes the specified channel from the configuration', async () => {
      await Configuration.deleteChannel('channel');
      expect(JSON.parse(await readFileAsync('channels.json', 'utf8'))).to.deep.equal({});
    });
  });
});
