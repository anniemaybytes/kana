import { Request, Response, NextFunction } from 'express';
import { CustomFailure } from './errors';

export async function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function asyncHandler(fn: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    return Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function parseUserHost(host: string) {
  try {
    const [user, rank, ab] = host.split('.').filter(Boolean);
    if (!user || !rank || ab !== 'AnimeBytes') throw new Error(); // caught and re-thrown below
    return { user, rank };
  } catch {
    throw new CustomFailure('InvalidABUser');
  }
}

export function bold(ircString: string) {
  return '\x02' + ircString + '\x02';
}

export function underline(ircString: string) {
  return '\x1f' + ircString + '\x1f';
}

export function spaceNick(ircString: string) {
  return ircString.split('').join('\u200B');
}

export function trimCommitUrl(url: string) {
  return url.replace(/([0-9a-f]{9})[0-9a-f]+/g, '$1');
}
