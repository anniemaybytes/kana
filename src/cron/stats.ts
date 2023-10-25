import { ABClient } from '../clients/animebytes.js';
import { IRCClient } from '../clients/irc.js';
import { Utils } from '../utils.js';
import { UserTimeDeltas } from '../types.js';

import { Logger } from '../logger.js';
const logger = Logger.get('Stats');

const STATS_UPDATE_PERIOD_MS = 300000;
const STATS_CHANNEL = '#animebytes';

export class Stats {
  private static interval?: ReturnType<typeof setInterval> = undefined;

  public static async update() {
    logger.debug('Starting stats collection');
    try {
      const onlineUsers: UserTimeDeltas = {};
      (await IRCClient.who(STATS_CHANNEL)).forEach((whoResponse) => {
        try {
          Utils.parseUserHost(whoResponse.hostname); // Just to check if the user has a valid hostname
          onlineUsers[Number(whoResponse.ident)] = { delta_time: Math.floor(STATS_UPDATE_PERIOD_MS / 1000) };
        } catch {
          logger.debug(`Invalid user ${whoResponse.nick} with host ${whoResponse.hostname} in ${STATS_CHANNEL}`);
        }
      });
      await ABClient.postStats(onlineUsers);
      logger.debug('Stats reporting complete');
    } catch (e) {
      logger.error('Unexpected error gathering/saving stats:', e);
    }
  }

  public static start() {
    Stats.interval = setInterval(Stats.update, STATS_UPDATE_PERIOD_MS);
    logger.info(`Now scheduled to report statistics every ${STATS_UPDATE_PERIOD_MS / 1000} seconds`);
  }

  public static shutDown() {
    if (Stats.interval) clearInterval(Stats.interval);
  }
}
