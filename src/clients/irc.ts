import * as irc from 'irc-framework';
import { sleep } from '../utils';
import { promisify } from 'util';
import { getAllChannels, saveChannels, deleteChannel } from './configuration';
import { MessageEvent, WHOISResponse, WHOResponse } from '../types';
import { getLogger } from '../logger';
const logger = getLogger('IRCClient');

const IGNORED_USERS: { [user: string]: boolean } = {};
(process.env.IRC_IGNORE_USERS || '').split(',').forEach((user: string) => {
  IGNORED_USERS[user.toLowerCase()] = true;
});
const ircClient = new irc.Client({ auto_reconnect: false });
ircClient.who[promisify.custom] = (target: string) =>
  new Promise((resolve, reject) => {
    setTimeout(() => reject(new Error('WHO took too long, maybe room is empty?')), 10000); // If who call takes longer than 10 seconds, consider it a failure
    ircClient.who(target, resolve);
  });
ircClient.whois[promisify.custom] = (target: string) =>
  new Promise((resolve, reject) => {
    setTimeout(() => reject(new Error('WHOIS took too long, nick is probably offline')), 2000); // If whois call takes longer than 2 seconds, consider it a failure
    ircClient.whois(target, resolve);
  });

export class IRCClient {
  public static IGNORED_USERS: { [user: string]: boolean } = IGNORED_USERS;
  public static IRC_NICK = process.env.IRC_NICK || 'testbot';
  public static IRC_NICK_LOWER = IRCClient.IRC_NICK.toLowerCase();
  public static IRC_SERVER = process.env.IRC_SERVER || 'localhost';
  public static IRC_PORT = Number(process.env.IRC_PORT) || 6667;
  public static IRC_USERNAME = process.env.IRC_USERNAME || 'testbot';
  public static IRC_REALNAME = process.env.IRC_REALNAME || 'testbot';
  public static IRC_USE_SSL = Boolean(process.env.IRC_USE_SSL);
  public static IRC_VERIFY_SSL = process.env.IRC_VERIFY_SSL !== 'false';
  public static registered = false;
  public static shuttingDown = false;
  public static bot = ircClient;

  private static bot_who = promisify(ircClient.who).bind(ircClient);
  private static bot_whois = promisify(ircClient.whois).bind(ircClient);

  public static isIgnoredUser(user: string) {
    return Boolean(IRCClient.IGNORED_USERS[user.toLowerCase()]);
  }

  public static isMe(nick: string) {
    return nick.toLowerCase() === IRCClient.IRC_NICK_LOWER;
  }

  public static checkIfRegistered() {
    if (!IRCClient.registered) throw new Error('IRC Bot is not yet registered!');
  }

  // This function is intended to be called without awaiting on startup, as it will never return unless shutting down,
  // continually trying to reconnect to IRC when necessary
  public static async connect() {
    while (!IRCClient.shuttingDown) {
      if (!IRCClient.registered) {
        IRCClient.bot.quit();
        logger.info(`Attempting to connect to IRC at ${IRCClient.IRC_SERVER}:${IRCClient.IRC_USE_SSL ? '+' : ''}${IRCClient.IRC_PORT}`);
        IRCClient.bot.connect({
          host: IRCClient.IRC_SERVER,
          port: IRCClient.IRC_PORT,
          nick: IRCClient.IRC_NICK,
          username: IRCClient.IRC_USERNAME,
          gecos: IRCClient.IRC_REALNAME,
          ssl: IRCClient.IRC_USE_SSL,
          rejectUnauthorized: IRCClient.IRC_VERIFY_SSL,
        });
      }
      await sleep(5000);
    }
  }

  public static shutDown() {
    IRCClient.shuttingDown = true;
    IRCClient.bot.quit();
  }

  // Stuff to do after gaining OPER priveleges
  public static async postOper() {
    logger.debug('Oper privileges gained');
    IRCClient.registered = true;
    IRCClient.rawCommand('MODE', IRCClient.IRC_NICK, '+B');
    IRCClient.rawCommand('CHGHOST', IRCClient.IRC_NICK, 'bakus.dungeon');
    const channels = await getAllChannels();
    for (const channel in channels) {
      logger.debug(`Attempting to join ${channel}: join mode ${channels[channel].join}`);
      if (channels[channel].join === 'auto') {
        IRCClient.joinRoomWithAdminIfNecessary(channel);
      } else if (channels[channel].join === 'sajoin') {
        IRCClient.rawCommand('SAJOIN', IRCClient.IRC_NICK, channel);
      } else if (channels[channel].join === 'join') {
        try {
          await IRCClient.joinRoom(channel);
        } catch (e) {
          if (!channels[channel].persist) {
            logger.warn(`Failed to join ${channel} with regular join mode, and persistence set to false. Removing channel from config.`);
            await deleteChannel(channel);
          }
        }
      } else {
        logger.error(`Channel ${channel} in channels config has invalid join parameter '${channels[channel].join}'; Ignoring this channel`);
      }
    }
  }

  // Join a room with normal /join and detect/throw for failure
  public static async joinRoom(channel: string) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Unable to join channel ${channel}`)), 5000); // If joining takes longer than 5 seconds, consider it a failure
      function channelUserListHandler(event: any) {
        if (event.channel.toLowerCase() === channel.toLowerCase()) {
          clearTimeout(timeout);
          resolve();
        }
      }
      IRCClient.bot.on('userlist', channelUserListHandler);
      IRCClient.bot.join(channel);
      setTimeout(() => IRCClient.bot.removeListener('userlist', channelUserListHandler), 5001); // Cleanup userlist handler
    });
  }

  public static async joinRoomWithAdminIfNecessary(channel: string) {
    return new Promise((resolve, reject) => {
      const timeout1 = setTimeout(() => IRCClient.rawCommand('SAJOIN', IRCClient.IRC_NICK, channel), 2000); // Perform sajoin if regular join doesn't work within 2 seconds
      const timeout2 = setTimeout(() => reject(new Error(`Unable to join channel ${channel}`)), 10000); // If joining takes longer than 10 seconds, consider it a failure
      function channelUserListHandler(event: any) {
        if (event.channel.toLowerCase() === channel.toLowerCase()) {
          clearTimeout(timeout1);
          clearTimeout(timeout2);
          resolve();
        }
      }
      IRCClient.bot.on('userlist', channelUserListHandler);
      IRCClient.bot.join(channel);
      setTimeout(() => IRCClient.bot.removeListener('userlist', channelUserListHandler), 10001); // Cleanup userlist handler
    });
  }

  public static async waitUntilRegistered() {
    while (!IRCClient.registered) await sleep(100);
  }

  public static rawCommand(...command: string[]) {
    IRCClient.checkIfRegistered();
    logger.trace(command);
    IRCClient.bot.raw(IRCClient.bot.rawString(command));
  }

  public static async who(target: string) {
    IRCClient.checkIfRegistered();
    logger.debug(`Requesting WHO at ${target}`);
    const response = await IRCClient.bot_who(target);
    return response.users as WHOResponse[];
  }

  public static async whois(nick: string) {
    IRCClient.checkIfRegistered();
    logger.debug(`Requesting WHOIS at ${nick}`);
    const response = await IRCClient.bot_whois(nick);
    return response as WHOISResponse;
  }

  public static message(target: string, message: string) {
    IRCClient.checkIfRegistered();
    logger.trace(`Sending to ${target} | msg: ${message}`);
    message.split('\n').forEach((msg) => IRCClient.bot.say(target, msg));
  }

  // Used for pre-processing before passing off to user callback, such as checking for ignored users
  // Not meant to be called directly. Only public for testing purposes
  public static callbackWrapper(callback: (event: MessageEvent) => any) {
    return (event: MessageEvent) => {
      if (IRCClient.isIgnoredUser(event.nick)) return;
      event.privateMessage = IRCClient.isMe(event.target);
      callback(event);
    };
  }

  public static addMessageHook(regex: RegExp, callback: (event: MessageEvent) => any) {
    IRCClient.bot.matchMessage(regex, IRCClient.callbackWrapper(callback));
  }
}

let connected = false;
ircClient.on('close', () => {
  if (connected && !IRCClient.shuttingDown) logger.error('Error! Disconnected from IRC server!');
  connected = false;
  IRCClient.registered = false;
});

ircClient.on('registered', async () => {
  connected = true;
  logger.info('Successfully connected to IRC server');
  if (!IRCClient.IRC_VERIFY_SSL && IRCClient.IRC_USE_SSL) logger.warn(`Connection was established on secure channel without TLS peer verification`);
  IRCClient.bot.raw(IRCClient.bot.rawString('OPER', process.env.OPER_USERNAME || '', process.env.OPER_PASS || ''));
});

ircClient.on('unknown command', (command: any) => {
  if (command.command === '381') IRCClient.postOper();
  else if (command.command === '491') logger.error('Registering as oper has failed. Possibly bad O:LINE password?');
});

ircClient.on('invite', async (event: any) => {
  if (IRCClient.isIgnoredUser(event.nick) || !IRCClient.isMe(event.invited)) return;
  logger.info(`Joining ${event.channel} due to invitation from ${event.nick}`);
  await IRCClient.joinRoom(event.channel);
  // If we are here, we have joined the channel successfully, so save this to state
  await saveChannels({ [event.channel]: { join: 'join', persist: false } });
});

ircClient.on('nick in use', () => {
  logger.error(`Error: Attempted nickname ${IRCClient.IRC_NICK} is currently in use. Will retry`);
});

ircClient.on('debug', (event: string) => {
  logger.debug(event);
});

ircClient.on('raw', (event: any) => {
  if (event.from_server) logger.trace(event.line);
});

// If specified, automatically trigger OPER success
if (process.env.IGNORE_OPER_FAILURE?.toLowerCase() === 'true') setTimeout(() => IRCClient.postOper(), 3000);
