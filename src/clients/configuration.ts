import fs from 'fs';
import { promisify } from 'util';

import { CustomFailure } from '../errors.js';
import { ChannelConfig } from '../types.js';

import { Logger } from '../logger.js';
const logger = Logger.get('Configuration');

const readFileAsync = promisify(fs.readFile).bind(fs);
const writeFileAsync = promisify(fs.writeFile).bind(fs);

const CHANNEL_CONFIG_JSON = 'channels.json';

export class Configuration {
  public static async getAllChannels() {
    let data: any = {};
    try {
      data = JSON.parse(await readFileAsync(CHANNEL_CONFIG_JSON, 'utf8'));
    } catch (e) {
      if (e.code !== 'ENOENT') throw new Error(`Couldn't parse ${CHANNEL_CONFIG_JSON}: ${e}`);
      logger.warn(`Channels configuration (${CHANNEL_CONFIG_JSON}) not found. Writing and continuing with empty state`);
      await writeFileAsync(CHANNEL_CONFIG_JSON, '{}');
    }
    // Set defaults if they are not provided
    for (const channel in data) {
      if (data[channel].persist === undefined) data[channel].persist = false;
      if (data[channel].join === undefined) data[channel].join = 'auto';
    }
    return data as ChannelConfig;
  }
  public static async getChannel(channel: string) {
    const currentData = await Configuration.getAllChannels();
    if (!currentData[channel]) throw new CustomFailure('NotFound', `Channel ${channel} was not found in config`);
    return currentData[channel];
  }

  // Merges channels passed in with what is already saved. Overwriting already saved channel with provided if conflict
  public static async saveChannels(channels: ChannelConfig) {
    const currentData = await Configuration.getAllChannels();
    await writeFileAsync(CHANNEL_CONFIG_JSON, JSON.stringify({ ...currentData, ...channels }, null, 2));
  }

  public static async deleteChannel(channel: string) {
    const currentData = await Configuration.getAllChannels();
    delete currentData[channel];
    await writeFileAsync(CHANNEL_CONFIG_JSON, JSON.stringify(currentData, null, 2));
  }
}
