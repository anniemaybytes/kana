import express from 'express';
import bodyParser from 'body-parser';
import { handleCIWebhook } from '../webhooks/ci';
import { handleGitWebhook } from '../webhooks/git';
import logger from '../logger';

export function startWebhookServer() {
  const LISTEN_PORT = Number(process.env.HTTP_PORT) || 4321;
  const GIT_WEBHOOK = process.env.GIT_WEBHOOK;

  const app = express();
  app.use(bodyParser.json());

  if (GIT_WEBHOOK) {
    app.post(`/git/${GIT_WEBHOOK}`, handleGitWebhook);
    app.post(`/ci/${GIT_WEBHOOK}`, handleCIWebhook);
  } else {
    logger.warn('Environment variable GIT_WEBHOOK not provided. Webhooks will not work.');
  }

  app.listen(LISTEN_PORT, '0.0.0.0');
  logger.info(`Listening for HTTP webhooks on port ${LISTEN_PORT}`);
}
