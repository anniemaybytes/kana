import 'source-map-support/register';
import logger from './logger';
import { IRCClient } from './clients/irc';
import { echoListen, echoShutdown } from './listeners/echo';
import { startWebhookServer, webhookShutdown } from './listeners/webhook';
import { addCommands } from './commands';
import { scheduleStatsReporter, unscheduleStatsReporter } from './cron/stats';

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

let sigIntReceived = false;
process.on('SIGINT', () => {
  // If spamming SIGINT, exit without caring about properly shutting down everything
  if (sigIntReceived) process.exit(1);
  sigIntReceived = true;
  logger.error('\nSIGINT received. Shutting down.');
  unscheduleStatsReporter();
  echoShutdown();
  webhookShutdown();
  IRCClient.shutDown();
  process.exit(1);
});

main().catch(logger.error);
