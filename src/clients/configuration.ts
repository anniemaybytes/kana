import fs from 'fs';
import { promisify } from 'util';
import { CustomFailure } from '../errors';
import { ChannelConfig } from '../types';

const readFileAsync = promisify(fs.readFile).bind(fs);
const writeFileAsync = promisify(fs.writeFile).bind(fs);

const CHANNEL_CONFIG_JSON = 'channels.json';

export async function getAllChannels() {
  const data = JSON.parse(await readFileAsync(CHANNEL_CONFIG_JSON, 'utf8'));
  // Set defaults if they are not provided
  for (const channel in data) {
    if (data[channel].persist === undefined) data[channel].persist = false;
    if (data[channel].join === undefined) data[channel].join = 'auto';
  }
  return data as ChannelConfig;
}

export async function getChannel(channel: string) {
  const currentData = await getAllChannels();
  if (!currentData[channel]) throw new CustomFailure('NotFound', `Channel ${channel} was not found in config`);
  return currentData[channel];
}

// Merges channels passed in with what is already saved. Overwriting already saved channel with provided if conflict
export async function saveChannels(channels: ChannelConfig) {
  const currentData = await getAllChannels();
  await writeFileAsync(CHANNEL_CONFIG_JSON, JSON.stringify({ ...currentData, ...channels }));
}

export async function deleteChannel(channel: string) {
  const currentData = await getAllChannels();
  delete currentData[channel];
  await writeFileAsync(CHANNEL_CONFIG_JSON, JSON.stringify(currentData));
}
