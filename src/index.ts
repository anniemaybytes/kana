import logger from './logger';
import { IRCClient } from './clients/irc';
import { echoListen } from './listeners/echo';
import { startWebhookServer } from './listeners/webhook';
import { addCommands } from './commands';
import { scheduleStatsReporter } from './cron/stats';

async function main() {
  logger.info('Starting kana');
  // Initialize and connect the actual irc bot
  addCommands();
  IRCClient.connect();
  await IRCClient.waitUntilRegistered();
  // Start listening on the raw echo port
  echoListen();
  // Start listening for webhooks
  startWebhookServer();
  // Start the scheduled stats reporter
  scheduleStatsReporter();
}

main().catch(logger.error);
