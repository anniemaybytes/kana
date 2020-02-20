import nodeFetch from 'node-fetch';
import logger from '../logger';

export interface UserAuthResponse {
  success: boolean;
  error: string;
  id: number;
  host: string;
  channels: {
    [room: string]: boolean;
  };
}

export interface UserTimeDeltas {
  [userId: number]: {
    delta_time: number;
  };
}

export class ABClient {
  public static fetch = nodeFetch;
  public static url = 'https://animebytes.tv';
  public static siteApiKey = process.env.SITE_API_KEY || 'testingKey';

  public static async postStats(userTimeDeltas: UserTimeDeltas) {
    await ABClient.makeRequest('/api/irc/notifier', { stats: userTimeDeltas });
  }

  public static async authUserForRooms(username: string, key: string, channels: string[]) {
    return (await ABClient.makeRequest('/api/irc/auth_user', { username, key, channels })) as UserAuthResponse;
  }

  public static async getUserInfo(username: string) {
    return (await ABClient.makeRequest('/api/irc/user_info', { username })).message as string;
  }

  public static async performDess(username: string) {
    return (await ABClient.makeRequest('/api/irc/dess_tax', { username })).message as string;
  }

  // Not meant to be called directly from outside the client. Public for testing purposes
  public static async makeRequest(path: string, body: any, authenticated = true) {
    const url = `${ABClient.url}${path}`;
    if (authenticated) body.authKey = ABClient.siteApiKey;
    logger.trace(`AnimeBytes POST ${url} -> ${body}`);
    const res = await ABClient.fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const responseBody = await res.text();
    const responseLog = `AnimeBytes POST ${url} <- [${res.status}] ${responseBody}`;
    if (!res.ok) {
      logger.debug(responseLog);
      throw new Error(responseLog);
    } else {
      logger.trace(responseLog);
    }
    try {
      return JSON.parse(responseBody);
    } catch {
      return responseBody;
    }
  }
}
