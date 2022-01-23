import 'source-map-support/register.js';

import { Configuration } from './clients/configuration.js';
import { IRCClient } from './clients/irc.js';
import { Echo } from './listeners/echo.js';
import { Webhook } from './listeners/webhook.js';
import { Stats } from './cron/stats.js';
import { EnterCommand } from './commands/enter.js';
import { IdentifyCommand } from './commands/identify.js';
import { LinkCommand } from './commands/link.js';
import { UserCommand } from './commands/user.js';

import { Logger } from './logger.js';
const logger = Logger.get('main');

async function main() {
  logger.info('Starting kana');

  await Configuration.getAllChannels();
  EnterCommand.register();
  IdentifyCommand.register();
  UserCommand.register();
  LinkCommand.register();

  IRCClient.connect();
  await IRCClient.waitUntilRegistered();

  Echo.start();
  Webhook.start();
  Stats.start();
}

let stopSignalReceived = false;
function shutDown() {
  // If spamming a stop signal, exit without caring about properly shutting down everything
  if (stopSignalReceived) process.exit(1);

  logger.error('Signal to stop received, shutting down');
  stopSignalReceived = true;

  Stats.shutDown();
  Echo.shutDown();
  Webhook.shutDown();
  IRCClient.shutDown();

  process.exit(0);
}

process.on('SIGINT', shutDown);
process.on('SIGTERM', shutDown);

main().catch((e) => logger.error('Unexpected fatal error:', e));
