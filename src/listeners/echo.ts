import net from 'net';
import { IRCClient } from '../clients/irc';
import logger from '../logger';

const LISTEN_PORT = Number(process.env.ECHO_PORT) || 1234;

function bbcode(text: string) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/\[url\](.*)\[\/url\]/gi, '$1')
    .replace(/\[url=(.*)\](.*)\[\/url\]/gi, '$1 - $2')
    .replace(/\[color=(.*)\](.*)\[\/color\]/gi, '$2');
}

// Not intended to be called directly outside of this module, only exported for testing
export function rawEchoSocketHandler(socket: net.Socket) {
  socket.on('data', data => {
    const dataString = data.toString();
    logger.trace(`Echo request: ${dataString}`);
    const [channels, text] = dataString.split('|%|');
    const message = bbcode(text);
    channels.split('-').forEach(channel => {
      IRCClient.message(`#${channel}`, message);
    });
    socket.end();
  });
}

export async function echoListen() {
  net.createServer(rawEchoSocketHandler).listen(LISTEN_PORT);
  logger.info(`Listening for raw ECHO on port ${LISTEN_PORT}`);
}
