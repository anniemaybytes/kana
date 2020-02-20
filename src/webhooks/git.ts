import { Request, Response } from 'express';
import { IRCClient } from '../clients/irc';
import { asyncHandler, bold, underline } from '../utils';
import logger from '../logger';

function trim_commit_url(url: string) {
  return url.replace(/(\/[0-9a-f]{9})[0-9a-f]+$/, '$1');
}

export const handleGitWebhook = asyncHandler(async (req: Request, res: Response) => {
  const REPORT_CHANNEL = process.env.GIT_CHANNEL || '';
  logger.debug('Git Webhook Triggered');
  logger.trace(JSON.stringify(req.body));

  const hook = req.body;
  const eventType = req.get('X-Gitea-Event') || '';
  logger.debug(`Gitea event ${eventType}`);
  const messages = [];

  const branch = hook.ref.replace('refs/heads/', '').replace('refs/tags/', '') || 'unknown';

  if (eventType === 'push') {
    if (hook.commits.length > 0) {
      messages.push(`${bold(hook.sender.login)} pushed ${bold(hook.commits.length)} commits to ${bold(branch)} on ${bold(hook.repository.name)}:`);
      for (let i = 0; i <= 10 && i < hook.commits.length; i++) {
        const commit = hook.commits[i];
        messages.push(` * ${commit.author.name}: ${commit.message.split('\n')[0]} (${underline(trim_commit_url(commit.url))})`);
      }
      if (hook.commits.length > 1) messages.push(`Entire diff: ${underline(hook.compare_url)}`);
    }
  } else if (eventType === 'create') {
    messages.push(`${bold(hook.sender.login)} created new ${hook.ref_type} ${bold(branch)} on ${bold(hook.repository.name)}`);
  } else if (eventType === 'delete') {
    messages.push(`${bold(hook.sender.login)} deleted ${hook.ref_type} ${bold(branch)} on ${bold(hook.repository.name)}`);
  }

  messages.forEach(message => IRCClient.message(REPORT_CHANNEL, message));
  res.end('Success');
});
