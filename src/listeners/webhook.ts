import express from 'express';
import http from 'http';

import { CIWebhook } from '../webhooks/drone.js';
import { GitWebhook } from '../webhooks/gitea.js';

import { Logger } from '../logger.js';
const logger = Logger.get('Webhook');

const LISTEN_BIND = process.env.HTTP_BIND || '::';
const LISTEN_PORT = Number(process.env.HTTP_PORT) || 4321;

export class Webhook {
  private static server: http.Server | undefined = undefined;

  public static start(imp: any /* for testing */ = express) {
    const app = imp();

    app.post(`/webhook/gitea`, express.raw({ type: 'application/json' }), GitWebhook.verify, GitWebhook.handle);
    app.post(`/webhook/drone`, express.json(), CIWebhook.verify, CIWebhook.handle);

    Webhook.server = app.listen(LISTEN_PORT, LISTEN_BIND);
    logger.info(`Listening for HTTP webhooks on ${LISTEN_BIND}:${LISTEN_PORT}`);
  }

  public static shutDown() {
    if (Webhook.server) Webhook.server.close();
  }
}
