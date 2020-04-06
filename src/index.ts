import 'source-map-support/register';
import { getAllChannels } from './clients/configuration';
import { IRCClient } from './clients/irc';
import { echoListen, echoShutdown } from './listeners/echo';
import { startWebhookServer, webhookShutdown } from './listeners/webhook';
import { addCommands } from './commands';
import { scheduleStatsReporter, unscheduleStatsReporter } from './cron/stats';
import { getLogger } from './logger';
const logger = getLogger('main');

async function main() {
  logger.info('Starting kana');
  // Ensure channels configuration is valid first
  await getAllChannels();
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

let stopSignalReceived = false;
function shutdown() {
  // If spamming a stop signal, exit without caring about properly shutting down everything
  if (stopSignalReceived) process.exit(1);
  stopSignalReceived = true;
  logger.error('Signal to stop received, shutting down');
  unscheduleStatsReporter();
  echoShutdown();
  webhookShutdown();
  IRCClient.shutDown();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

main().catch((e) => logger.error('Unexpected fatal error:', e));
