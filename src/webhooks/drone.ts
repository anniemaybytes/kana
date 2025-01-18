import { NextFunction, Request, Response } from 'express';
import httpSignature from 'http-signature';

import { IRCClient } from '../clients/irc.js';
import { Utils } from '../utils.js';

import { Logger } from '../logger.js';
const logger = Logger.get('DroneWebhook');

export class CIWebhook {
  public static verify(req: Request, res: Response, next: NextFunction, imp: any /* for testing */ = httpSignature) {
    try {
      const parsed = imp.parseRequest(req);
      if (!imp.verifyHMAC(parsed, process.env.GIT_WEBHOOK || '')) throw new Error('verifyHMAC returned false'); // Caught and handled below
      return next();
    } catch (e) {
      logger.debug(`Bad auth from Drone: ${e}`);
      return res.status(403).send({ success: false, error: 'bad signature provided' });
    }
  }

  public static async handle(req: Request, res: Response, next: NextFunction): Promise<void> {
    const REPORT_CHANNEL = process.env.GIT_CHANNEL || '';
    logger.trace(JSON.stringify(req.body));

    const hook = req.body;
    const messages = [];
    if (hook.event === 'build') {
      const link = `${hook.system.link}/${hook.repo.slug}/${hook.build.number}`;
      if (hook.action === 'created') {
        const sender = hook.build.trigger === '@cron' ? 'Cron system' : Utils.space(hook.build.author_login);
        messages.push(
          `CI: Build job #${hook.build.number} by ${Utils.bold(sender)} for ${Utils.bold(hook.repo.slug)} created (${Utils.underline(link)})`,
        );
        if (hook.build.link && hook.build.trigger !== '@cron')
          messages.push(` Changes staged: ${Utils.underline(Utils.trimCommit(hook.build.link))}`);
      } else if (hook.action === 'updated') {
        if (hook.build.status === 'success') {
          messages.push(`CI: Build job #${hook.build.number} for ${Utils.bold(hook.repo.slug)} completed succesfully (${Utils.underline(link)})`);
        } else if (hook.build.status === 'killed') {
          messages.push(`CI: Build job #${hook.build.number} for ${Utils.bold(hook.repo.slug)} was cancelled (${Utils.underline(link)})`);
        } else if (hook.build.status === 'failure') {
          messages.push(`CI: Build job #${hook.build.number} for ${Utils.bold(hook.repo.slug)} failed (${Utils.underline(link)})`);
        } else if (hook.build.status === 'error') {
          messages.push(`CI: Build job #${hook.build.number} for ${Utils.bold(hook.repo.slug)} errored (${Utils.underline(link)})`);
        }
      }
    }

    messages.forEach((message) => IRCClient.message(REPORT_CHANNEL, message));
    res.send({ success: true });

    return next();
  }
}
