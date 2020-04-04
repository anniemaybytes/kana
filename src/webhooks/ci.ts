import { Request, Response } from 'express';
import { IRCClient } from '../clients/irc';
import { asyncHandler, bold, underline } from '../utils';
import { getLogger } from '../logger';
const logger = getLogger('CIWebhook');

export const handleCIWebhook = asyncHandler(async (req: Request, res: Response) => {
  const REPORT_CHANNEL = process.env.GIT_CHANNEL || '';
  logger.debug('CI Webhook Triggered');
  logger.trace(JSON.stringify(req.body));

  const hook = req.body;
  const messages = [];
  if (hook.event === 'build') {
    const link = `${hook.system.link}/${hook.repo.slug}/${hook.build.number}`;
    if (hook.action === 'created') {
      const sender = hook.build.trigger === '@cron' ? 'Cron system' : hook.build.author_login;
      messages.push(`CI: Build job #${hook.build.number} by ${bold(sender)} for ${bold(hook.repo.slug)} created (${underline(link)})`);
      if (hook.build.before && hook.build.link && hook.build.before !== '0000000000000000000000000000000000000000' && hook.build.trigger !== '@cron')
        messages.push(` Changes staged: ${underline(hook.build.link)}`);
    } else if (hook.action === 'updated') {
      if (hook.build.status === 'success') {
        messages.push(`CI: Build job #${hook.build.number} for ${bold(hook.repo.slug)} completed succesfully (${underline(link)})`);
      } else if (hook.build.status === 'killed') {
        messages.push(`CI: Build job #${hook.build.number} for ${bold(hook.repo.slug)} was cancelled (${underline(link)})`);
      } else if (hook.build.status === 'failure') {
        messages.push(`CI: Build job #${hook.build.number} for ${bold(hook.repo.slug)} failed (${underline(link)})`);
      } else if (hook.build.status === 'error') {
        messages.push(`CI: Build job #${hook.build.number} for ${bold(hook.repo.slug)} errored (${underline(link)})`);
      }
    }
  }

  messages.forEach((message) => IRCClient.message(REPORT_CHANNEL, message));
  res.end('Success');
});
