import { IRCClient } from '../clients/irc';
import { ABClient } from '../clients/animebytes';
import { parseUserHost } from '../utils';
import { CustomFailure } from '../errors';
import logger from '../logger';

const userRegex = /^!user(?:\s([^\s]+))?/i;

// Not meant to be used externally. Exported for testing reasons
export async function getUserInfoByIRCNick(ircNick: string) {
  let ABUsername: string;
  try {
    const ircUserHostname = (await IRCClient.whois(ircNick)).hostname;
    ABUsername = parseUserHost(ircUserHostname).user;
  } catch (e) {
    throw new CustomFailure('NotFound'); // Any failure here should be considered as not found
  }
  return ABClient.getUserInfo(ABUsername);
}

export function listenForUser() {
  IRCClient.addMessageHook(userRegex, async (event) => {
    if (event.privateMessage) return;
    logger.debug(`user request from ${event.hostname}`);
    try {
      // Get the name we need to check
      let name = parseUserHost(event.hostname).user;
      const matches = event.message.match(userRegex);
      let usernameProvided = false;
      if (matches && matches[1]) {
        name = matches[1];
        usernameProvided = true;
      }

      // Call AB for the userinfo of this name
      let userInfo = '';
      try {
        userInfo = await ABClient.getUserInfo(name);
      } catch (e) {
        // Try to find specified user by their IRC nickname if they are registered and have a valid AB hostname
        if (e.code === 'NotFound' && usernameProvided) userInfo = await getUserInfoByIRCNick(name);
        else throw e;
      }

      // Reply with the userinfo from AB
      event.reply(userInfo);
    } catch (e) {
      if (e.code === 'InvalidABUser') return event.reply('Not authorized');
      if (e.code === 'NotFound') return event.reply('User not found');
      logger.error('Unexpected error processing !user', e);
      return event.reply('Internal error');
    }
  });
}
