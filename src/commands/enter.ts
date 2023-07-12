import { IRCClient } from '../clients/irc.js';
import { ABClient } from '../clients/animebytes.js';
import { UserAuthResponse } from '../types.js';

import { Logger } from '../logger.js';
const logger = Logger.get('EnterCommand');

export class EnterCommand {
  private static regex = /^\s*ENTER\s+(\S+)\s+(\S+)\s+(\S+)\s*$/i;

  public static register() {
    IRCClient.addMessageHook(EnterCommand.regex, async (event) => {
      if (!event.privateMessage) return;
      // Unfortunately irc-framework does not have any way to return the match from its regex check,
      // so we must do the regex again here to actually pull the match we're looking for
      const matches = event.message.match(EnterCommand.regex);
      if (!matches) return;
      logger.debug(`ENTER request from nick ${event.nick}`);
      let authResponse: UserAuthResponse;
      try {
        authResponse = await ABClient.authUserForRooms(
          matches[2],
          matches[3],
          matches[1].split(',').map((room) => room.trim().toLowerCase()),
        );
      } catch (e) {
        logger.error('Error authing user', e);
        return event.reply('Unable to identify you at the moment, please try again later');
      }
      if (!authResponse.success) return event.reply(authResponse.error);

      IRCClient.rawCommand('CHGIDENT', event.nick, authResponse.id.toString());
      IRCClient.rawCommand('CHGHOST', event.nick, authResponse.host);

      for (const room in authResponse.channels) {
        if (authResponse.channels[room]) {
          IRCClient.rawCommand('SAJOIN', event.nick, room);
        } else {
          event.reply(`Access denied for ${room}`);
        }
      }
    });
  }
}
