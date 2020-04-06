import express, { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import httpSignature from 'http-signature';
import { handleCIWebhook } from '../webhooks/ci';
import { handleGitWebhook } from '../webhooks/git';
import { getLogger } from '../logger';
const logger = getLogger('WebhookListener');

const LISTEN_PORT = Number(process.env.HTTP_PORT) || 4321;

// Only exported for testing purposes
export function verifyGiteaSig(req: Request, res: Response, next: NextFunction) {
  const bodyStr = req.body.toString('utf8');
  try {
    const signature = req.get('X-Gitea-Signature');
    if (!signature) return res.status(403).send({ error: 'No signature provided' });
    logger.trace(`Gitea signature: ${signature}\nRequest body: ${bodyStr}`);
    const signatureBuf = Buffer.from(signature, 'hex');
    const generatedHmac = crypto
      .createHmac('sha256', process.env.GIT_WEBHOOK || '')
      .update(req.body)
      .digest();
    // Caught and handled below
    if (!crypto.timingSafeEqual(signatureBuf, generatedHmac)) throw new Error('HMACs do not match');
  } catch (e) {
    logger.debug(`Bad gitea signature error: ${e}`);
    return res.status(403).send({ error: 'Bad signature provided' });
  }
  try {
    req.body = JSON.parse(bodyStr);
  } catch (e) {
    logger.debug(`Invalid JSON from gitea: ${e}`);
    return res.status(400).send('Invalid JSON');
  }
  return next();
}

export function verifyDroneSig(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = httpSignature.parseRequest(req);
    // Caught and handled below
    if (!httpSignature.verifyHMAC(parsed, process.env.GIT_WEBHOOK || '')) throw new Error('verifyHMAC returned false');
    return next();
  } catch (e) {
    logger.debug(`Bad auth from drone: ${e}`);
    return res.status(403).send({ error: 'Bad signature provided' });
  }
}

let server: any = undefined;

export function startWebhookServer() {
  const app = express();

  app.post(`/git`, express.raw({ type: 'application/json' }), verifyGiteaSig, handleGitWebhook);
  app.post(`/ci`, express.json(), verifyDroneSig, handleCIWebhook);

  server = app.listen(LISTEN_PORT, '0.0.0.0');
  logger.info(`Listening for HTTP webhooks on port ${LISTEN_PORT}`);
}

export function webhookShutdown() {
  if (server) server.close();
}
