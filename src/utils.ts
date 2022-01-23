import { CustomFailure } from './errors.js';

export class Utils {
  public static async sleep(ms: number) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  public static bbcode(text: string) {
    if (!text) return '';
    return text
      .replace(/\[url\](.*)\[\/url\]/gi, '$1')
      .replace(/\[url=(.*)\](.*)\[\/url\]/gi, '$1 - $2')
      .replace(/\[color=(.*)\](.*)\[\/color\]/gi, '$2');
  }

  public static parseUserHost(host: string) {
    try {
      const [user, rank, ab] = host.split('.').filter(Boolean);
      if (!user || !rank || ab !== 'AnimeBytes') throw new Error(); // caught and re-thrown below
      return { user, rank };
    } catch {
      throw new CustomFailure('InvalidABUser');
    }
  }

  public static bold(ircString: string) {
    return '\x02' + ircString + '\x02';
  }

  public static underline(ircString: string) {
    return '\x1f' + ircString + '\x1f';
  }

  public static space(ircString: string) {
    return ircString.split('').join('\u200B');
  }

  public static trimCommit(url: string) {
    return url.replace(/([0-9a-f]{9})[0-9a-f]+/g, '$1');
  }
}
