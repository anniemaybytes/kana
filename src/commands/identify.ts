import { IRCClient } from '../clients/irc.js';
import { ABClient } from '../clients/animebytes.js';
import { UserAuthResponse } from '../types.js';

import { Logger } from '../logger.js';
const logger = Logger.get('IdentifyCommand');

export class IdentifyCommand {
  private static regex = /^\s*IDENTIFY\s+(\S+)\s+(\S+)\s*$/i;

  public static register() {
    IRCClient.addMessageHook(IdentifyCommand.regex, async (event) => {
      if (!event.privateMessage) return;
      const matches = event.message.match(IdentifyCommand.regex);
      if (!matches) return;
      logger.debug(`IDENTIFY request from nick ${event.nick}`);
      let authResponse: UserAuthResponse;
      try {
        authResponse = await ABClient.authUserForRooms(matches[1], matches[2], []);
      } catch (e) {
        logger.error('Error authing user', e);
        return event.reply('Unable to identify you at the moment, please try again later');
      }
      if (!authResponse.success) return event.reply(authResponse.error);

      IRCClient.rawCommand('CHGIDENT', event.nick, authResponse.uid.toString());
      IRCClient.rawCommand('CHGHOST', event.nick, authResponse.hostmask);
      event.reply(`Successfully identified as ${matches[1]}`);
    });
  }
}
