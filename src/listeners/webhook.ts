import express from 'express';
import http from 'http';

import { CIWebhook } from '../webhooks/ci.js';
import { GitWebhook } from '../webhooks/git.js';

import { Logger } from '../logger.js';
const logger = Logger.get('Webhook');

const LISTEN_PORT = Number(process.env.HTTP_PORT) || 4321;

export class Webhook {
  private static server: http.Server | undefined = undefined;

  public static start(imp: any /* for testing */ = express) {
    const app = imp();

    app.post(`/git`, express.raw({ type: 'application/json' }), GitWebhook.verify, GitWebhook.handle);
    app.post(`/ci`, express.json(), CIWebhook.verify, CIWebhook.handle);

    Webhook.server = app.listen(LISTEN_PORT, '0.0.0.0');
    logger.info(`Listening for HTTP webhooks on port ${LISTEN_PORT}`);
  }

  public static shutDown() {
    if (Webhook.server) Webhook.server.close();
  }
}
