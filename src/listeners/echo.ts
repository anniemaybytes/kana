import net from 'net';

import { IRCClient } from '../clients/irc.js';
import { Utils } from '../utils.js';

import { Logger } from '../logger.js';
const logger = Logger.get('Echo');

const LISTEN_PORT = Number(process.env.ECHO_PORT) || 1234;

export class Echo {
  private static server: net.Server | undefined = undefined;

  public static handle(socket: net.Socket) {
    socket.on('data', (data) => {
      const dataString = data.toString();
      logger.trace(`Echo request: ${dataString}`);
      const [channels, text] = dataString.split('|%|');
      const message = Utils.bbcode(text);
      channels.split('-').forEach((channel) => {
        IRCClient.message(`#${channel}`, message);
      });
      socket.end();
    });
  }

  public static start() {
    Echo.server = net.createServer(Echo.handle).listen(LISTEN_PORT);
    logger.info(`Listening for raw ECHO on port ${LISTEN_PORT}`);
  }

  public static shutDown() {
    if (Echo.server) Echo.server.close();
  }
}
