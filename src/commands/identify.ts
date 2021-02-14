import { IRCClient } from '../clients/irc';
import { ABClient } from '../clients/animebytes';
import { UserAuthResponse } from '../types';
import { getLogger } from '../logger';
const logger = getLogger('EnterCommand');

const enterMatchRegex = /^(?:\s)*identify(?:\s)+([^\s]+)(?:\s)+([^\s]+)(?:\s)*$/i;

export function listenForIdentifyMsg() {
  IRCClient.addMessageHook(enterMatchRegex, async (event) => {
    if (!event.privateMessage) return;
    const matches = event.message.match(enterMatchRegex);
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

    IRCClient.rawCommand('CHGIDENT', event.nick, authResponse.id.toString());
    IRCClient.rawCommand('CHGHOST', event.nick, authResponse.host);
    event.reply(`Successfully identified as ${matches[1]}`);
  });
}
