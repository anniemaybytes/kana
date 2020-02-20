import { IRCClient } from '../clients/irc';
import { ABClient } from '../clients/animebytes';
import { parseUserHost } from '../utils';
import logger from '../logger';

const userRegex = /^!user(?: (.+))?/i;

export function listenForUser() {
  IRCClient.addMessageHook(userRegex, async event => {
    if (event.privateMessage) return;
    logger.debug(`user request from ${event.hostname}`);
    try {
      let name = parseUserHost(event.hostname).user;
      const matches = event.message.match(userRegex);
      if (matches && matches[1]) name = matches[1];
      event.reply(await ABClient.getUserInfo(name));
    } catch (e) {
      if (e.code === 'InvalidABUser') return event.reply('Not authorized');
      logger.error('Unexpected error processing !user', e);
      event.reply('Internal error');
    }
  });
}
