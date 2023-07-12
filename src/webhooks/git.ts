import { NextFunction, Request, Response } from 'express';
import crypto from 'crypto';

import { IRCClient } from '../clients/irc.js';
import { Utils } from '../utils.js';

import { Logger } from '../logger.js';
const logger = Logger.get('GitWebhook');

export class GitWebhook {
  public static verify(req: Request, res: Response, next: NextFunction) {
    const bodyStr = req.body.toString('utf8');
    try {
      const signature = req.get('X-Gitea-Signature');
      if (!signature) return res.status(403).send({ success: false, error: 'no signature provided' });
      logger.trace(`Gitea signature: ${signature}\nRequest body: ${bodyStr}`);
      const signatureBuf = Buffer.from(signature, 'hex');
      const generatedHmac = crypto
        .createHmac('sha256', process.env.GIT_WEBHOOK || '')
        .update(req.body)
        .digest();
      // Caught and handled below
      if (!crypto.timingSafeEqual(signatureBuf, generatedHmac)) throw new Error('HMACs do not match');
    } catch (e) {
      logger.debug(`Bad Gitea signature error: ${e}`);
      return res.status(403).send({ success: false, error: 'bad signature provided' });
    }
    try {
      req.body = JSON.parse(bodyStr);
    } catch (e) {
      logger.debug(`Invalid JSON from Gitea: ${e}`);
      return res.status(400).send({ success: false, error: 'invalid json' });
    }
    return next();
  }

  public static async handle(req: Request, res: Response, next: NextFunction): Promise<void> {
    const REPORT_CHANNEL = process.env.GIT_CHANNEL || '';
    logger.debug('Git Webhook Triggered');
    logger.trace(JSON.stringify(req.body));

    const hook = req.body;
    const eventType = req.get('X-Gitea-Event') || '';
    logger.debug(`Gitea event ${eventType}`);
    const messages = [];

    let branch = hook.ref?.replace('refs/heads/', '')?.replace('refs/tags/', '') || 'unknown';
    branch = Utils.space(branch);

    if (eventType === 'push') {
      if (hook.commits.length > 0) {
        messages.push(
          `${Utils.bold(Utils.space(hook.sender.login))} pushed ${Utils.bold(hook.commits.length)} commits to ${Utils.bold(branch)} on ${Utils.bold(
            hook.repository.name,
          )}:`,
        );
        for (let i = 0; i <= 10 && i < hook.commits.length; i++) {
          const commit = hook.commits[i];
          messages.push(` * ${Utils.space(commit.author.name)}: ${commit.message.split('\n')[0]} (${Utils.underline(Utils.trimCommit(commit.url))})`);
        }
        if (hook.commits.length > 1) messages.push(`Entire diff: ${Utils.underline(Utils.trimCommit(hook.compare_url))}`);
      }
    } else if (eventType === 'create') {
      messages.push(
        `${Utils.bold(Utils.space(hook.sender.login))} created new ${hook.ref_type} ${Utils.bold(branch)} on ${Utils.bold(hook.repository.name)}`,
      );
    } else if (eventType === 'delete') {
      messages.push(
        `${Utils.bold(Utils.space(hook.sender.login))} deleted ${hook.ref_type} ${Utils.bold(branch)} on ${Utils.bold(hook.repository.name)}`,
      );
    }

    messages.forEach((message) => IRCClient.message(REPORT_CHANNEL, message));
    res.send({ success: true });

    return next();
  }
}
