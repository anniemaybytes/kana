import { IRCClient } from '../clients/irc';
import { ABClient } from '../clients/animebytes';
import { UserAuthResponse } from '../types';
import { getLogger } from '../logger';
const logger = getLogger('EnterCommand');

const enterMatchRegex = /^(?:\s)*enter(?:\s)+([^\s]+)(?:\s)+([^\s]+)(?:\s)+([^\s]+)(?:\s)*$/i;

export function listenForEnterMsg() {
  IRCClient.addMessageHook(enterMatchRegex, async (event) => {
    if (!event.privateMessage) return;
    // Unfortunately irc-framework does not have any way to return the match from its regex check,
    // so we must do the regex again here to actually pull the match we're looking for
    const matches = event.message.match(enterMatchRegex);
    if (!matches) return;
    logger.debug(`User auth request from nick ${event.nick}`);
    let authResponse: UserAuthResponse;
    try {
      authResponse = await ABClient.authUserForRooms(
        matches[2],
        matches[3],
        matches[1].split(',').map((room) => room.trim().toLowerCase())
      );
    } catch (e) {
      logger.error('Error authing user', e);
      return event.reply('Internal error');
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
