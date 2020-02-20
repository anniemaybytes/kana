import logger from '../logger';
import * as irc from 'irc-framework';
import { sleep } from '../utils';
import { promisify } from 'util';

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

export interface MessageEvent {
  nick: string;
  ident: string;
  hostname: string;
  target: string;
  message: string;
  privateMessage: boolean;
  reply: (message: string) => void;
}

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
  public static bot = ircClient;

  private static bot_who = promisify(ircClient.who).bind(ircClient);

  public static isIgnoredUser(user: string) {
    return Boolean(IRCClient.IGNORED_USERS[user.toLowerCase()]);
  }

  public static isMe(nick: string) {
    return nick.toLowerCase() === IRCClient.IRC_NICK_LOWER;
  }

  public static checkIfRegistered() {
    if (!IRCClient.registered) throw new Error('IRC Bot is not yet registered!');
  }

  // This function is intended to be called without awaiting on startup, as it will never return, continually trying to reconnect to IRC when necessary
  public static async connect() {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (!IRCClient.registered) {
        IRCClient.bot.quit();
        logger.info(
          `Attempting to connect to irc at ${IRCClient.IRC_SERVER}:${IRCClient.IRC_PORT} ${IRCClient.IRC_USE_SSL ? 'with' : 'without'} ${
            IRCClient.IRC_VERIFY_SSL ? 'verified' : 'unverified'
          } tls`
        );
        IRCClient.bot.connect({
          host: IRCClient.IRC_SERVER,
          port: IRCClient.IRC_PORT,
          nick: IRCClient.IRC_NICK,
          username: IRCClient.IRC_USERNAME,
          gecos: IRCClient.IRC_REALNAME,
          ssl: IRCClient.IRC_USE_SSL,
          rejectUnauthorized: IRCClient.IRC_VERIFY_SSL
        });
      }
      await sleep(5000);
    }
  }

  // Stuff to do after gaining OPER priveleges
  public static async postOper() {
    logger.debug('Oper privileges gained');
    IRCClient.registered = true;
    IRCClient.rawCommand('MODE', IRCClient.IRC_NICK, '+B');
    IRCClient.rawCommand('CHGHOST', IRCClient.IRC_NICK, 'bakus.dungeon');
    process.env.CHANNELS?.split(',').forEach(channel => IRCClient.joinRoomWithAdminIfNecessary(channel));
  }

  public static async joinRoomWithAdminIfNecessary(channel: string) {
    return new Promise((resolve, reject) => {
      const timeout1 = setTimeout(() => IRCClient.rawCommand('SAJOIN', IRCClient.IRC_NICK, channel), 2000); // Perform sajoin if regular join doesn't work within 2 seconds
      const timeout2 = setTimeout(() => reject(new Error(`Unable to join channel ${channel}`)), 10000); // If joining takes longer than 10 seconds, consider it a failure
      function topicHandler(event: any) {
        if (event.channel.toLowerCase() === channel.toLowerCase()) {
          clearTimeout(timeout1);
          clearTimeout(timeout2);
          resolve();
        }
      }
      IRCClient.bot.on('topic', topicHandler);
      IRCClient.bot.join(channel);
      setTimeout(() => IRCClient.bot.removeListener('topic', topicHandler), 10001); // Cleanup topic handler
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
    logger.trace(JSON.stringify(response));
    return response.users as {
      nick: string;
      ident: string;
      hostname: string;
      server: string;
      real_name: string;
      away: boolean;
      num_hops_away: number;
      channel: string;
    }[];
  }

  public static message(target: string, message: string) {
    IRCClient.checkIfRegistered();
    logger.trace(`Sending to ${target} | msg: ${message}`);
    IRCClient.bot.say(target, message);
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
  if (connected) logger.error('Error! Disconnected from irc server!');
  connected = false;
  IRCClient.registered = false;
});

ircClient.on('registered', async () => {
  connected = true;
  logger.info('Successfully connected to irc server');
  IRCClient.bot.raw(IRCClient.bot.rawString('OPER', process.env.OPER_USERNAME || '', process.env.OPER_PASS || ''));
});

ircClient.on('unknown command', (command: any) => {
  if (command.command === '381') IRCClient.postOper();
  else if (command.command === '491') logger.error('Registering as OP has failed. Possible bad OPER user/pass?');
});

ircClient.on('invite', (event: any) => {
  if (IRCClient.isIgnoredUser(event.nick) || !IRCClient.isMe(event.invited)) return;
  logger.info(`Joining ${event.channel} due to invitation from ${event.nick}`);
  ircClient.join(event.channel);
  // TODO save channel to state for auto-rejoining on reboot
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
