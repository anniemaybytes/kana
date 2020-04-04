import { IRCClient } from '../clients/irc';
import { ABClient } from '../clients/animebytes';
import { parseUserHost } from '../utils';
import { getLogger } from '../logger';
const logger = getLogger('DessCommand');

export function listenForDess() {
  IRCClient.addMessageHook(/^!dess$/i, async (event) => {
    if (event.privateMessage) return;
    logger.debug(`Dess request from ${event.hostname}`);
    try {
      event.reply(await ABClient.performDess(parseUserHost(event.hostname).user));
    } catch (e) {
      if (e.code === 'InvalidABUser') return event.reply('Not authorized');
      logger.error('Unexpected error processing !dess', e);
      event.reply('Internal error');
    }
  });
}
