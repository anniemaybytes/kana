import { IRCClient } from '../clients/irc.js';
import { ABClient } from '../clients/animebytes.js';
import { Utils } from '../utils.js';
import { CustomFailure } from '../errors.js';

import { Logger } from '../logger.js';
const logger = Logger.get('UserCommand');

export class UserCommand {
  private static regex = /^!u(?:ser)?(?:\s(\S+)|$)/i;

  public static async getUserInfoByIRCNick(ircNick: string) {
    let ABUsername: string;
    try {
      const ircUserHostname = (await IRCClient.whois(ircNick)).hostname;
      ABUsername = Utils.parseUserHost(ircUserHostname).user;
    } catch (e) {
      throw new CustomFailure('NotFound'); // Any failure here should be considered as not found
    }
    return ABClient.getUserInfo(ABUsername);
  }

  public static register() {
    IRCClient.addMessageHook(UserCommand.regex, async (event) => {
      if (event.privateMessage) return;
      logger.debug(`!user request from ${event.hostname}`);
      try {
        // Get the name we need to check
        let name = Utils.parseUserHost(event.hostname).user;
        const matches = event.message.match(UserCommand.regex);
        let usernameProvided = false;
        if (matches && matches[1]) {
          name = matches[1];
          usernameProvided = true;
        }

        // Call AB for the userinfo of this name
        let userInfo = '';
        if (name.startsWith('@')) {
          // if prepending name with '@', explicitly lookup by irc nick
          userInfo = await UserCommand.getUserInfoByIRCNick(name.substring(1));
        } else {
          try {
            userInfo = await ABClient.getUserInfo(name); // try looking up provided name as AB username directly
          } catch (e) {
            // Try to find specified user by their IRC nickname if they are registered and have a valid AB hostname
            if (e.code === 'NotFound' && usernameProvided) userInfo = await UserCommand.getUserInfoByIRCNick(name);
            else throw e;
          }
        }

        // Reply with the userinfo from AB
        event.reply(userInfo);
      } catch (e) {
        if (e.code === 'InvalidABUser') return event.reply('Not authorized');
        if (e.code === 'NotFound') return event.reply('User not found');
        logger.error('Unexpected error processing !user', e);
        return event.reply('An error has occured, please try again later');
      }
    });
  }
}
