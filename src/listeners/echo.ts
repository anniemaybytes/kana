import net from 'net';
import crypto from 'crypto';

import { IRCClient } from '../clients/irc.js';
import { Utils } from '../utils.js';

import { Logger } from '../logger.js';
const logger = Logger.get('Echo');

const LISTEN_BIND = process.env.ECHO_BIND || '::';
const LISTEN_PORT = Number(process.env.ECHO_PORT) || 1234;

export class Echo {
  private static server: net.Server | undefined = undefined;

  public static handle(socket: net.Socket) {
    socket.on('data', (data) => {
      const dataString = data.toString();
      logger.trace(`ECHO request: ${dataString}`);

      if (dataString.split('|%|').length !== 3) {
        logger.debug(`Improperly formatted ECHO message from ${socket.remoteAddress}`);
        socket.destroy();
        return;
      }

      const [authKey, channels, text] = dataString.split('|%|');

      if (
        !crypto.timingSafeEqual(
          crypto
            .createHash('sha256')
            .update(process.env.ECHO_AUTH_KEY || '')
            .digest(),
          crypto.createHash('sha256').update(authKey).digest(),
        )
      ) {
        logger.debug(`Bad ECHO auth from ${socket.remoteAddress}`);
        socket.destroy();
        return;
      }

      const message = Utils.bbcode(text);
      channels.split('-').forEach((channel) => {
        IRCClient.message(`#${channel}`, message);
      });
      socket.end();
    });

    socket.on('error', (e) => {
      logger.debug(`Catched error from ECHO socket: ${e}`);
      socket.destroy();
    });
  }

  public static start() {
    Echo.server = net.createServer(Echo.handle).listen(LISTEN_PORT, LISTEN_BIND);
    logger.info(`Listening for raw ECHO on port ${LISTEN_BIND}:${LISTEN_PORT}`);
  }

  public static shutDown() {
    if (Echo.server) Echo.server.close();
  }
}
