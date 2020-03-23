import { ABClient } from '../clients/animebytes';
import { IRCClient } from '../clients/irc';
import { parseUserHost } from '../utils';
import logger from '../logger';
import { UserTimeDeltas } from '../types';

const STATS_UPDATE_PERIOD_MS = 300000;
const STATS_CHANNEL = '#animebytes';
let interval: any = undefined;

// Not intended to be called directly outside of this module, only exported for testing
export async function updateStats() {
  logger.info('Starting stats collection');
  try {
    const onlineUsers: UserTimeDeltas = {};
    (await IRCClient.who(STATS_CHANNEL)).forEach((whoResponse) => {
      try {
        parseUserHost(whoResponse.hostname); // Just to check if the user has a valid hostname
        onlineUsers[Number(whoResponse.ident)] = { delta_time: Math.floor(STATS_UPDATE_PERIOD_MS / 1000) };
      } catch {
        logger.debug(`Invalid user ${whoResponse.nick} with host ${whoResponse.hostname} in ${STATS_CHANNEL}`);
      }
    });
    await ABClient.postStats(onlineUsers);
  } catch (e) {
    logger.error('Unexpected error gathering/saving stats:', e);
  }
}

export function scheduleStatsReporter() {
  interval = setInterval(updateStats, STATS_UPDATE_PERIOD_MS);
  logger.info(`Now scheduled to report statistics every ${STATS_UPDATE_PERIOD_MS / 1000} seconds`);
}

export function unscheduleStatsReporter() {
  if (interval) clearInterval(interval);
}
