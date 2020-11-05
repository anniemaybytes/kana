import got from 'got';
import { CustomFailure } from '../errors';
import { UserAuthResponse, UserTimeDeltas } from '../types';
import { getLogger } from '../logger';
const logger = getLogger('AnimeBytesClient');

const REQUEST_TIMEOUT_MS = 30000;

export class ABClient {
  public static got = got.extend({
    followRedirect: false,
    throwHttpErrors: false,
    timeout: REQUEST_TIMEOUT_MS,
  });
  public static url = 'https://animebytes.tv';
  public static siteApiKey = process.env.SITE_API_KEY || '';

  public static async postStats(userTimeDeltas: UserTimeDeltas) {
    await ABClient.makeRequest('/api/irc/notifier', { stats: userTimeDeltas });
  }

  public static async authUserForRooms(username: string, key: string, channels: string[]) {
    return (await ABClient.makeRequest('/api/irc/auth_user', { username, key, channels })) as UserAuthResponse;
  }

  public static async getUserInfo(username: string) {
    const response = await ABClient.makeRequest('/api/irc/user_info', { username });
    if (!response.success) throw new CustomFailure('NotFound', response.error);
    return response.message as string;
  }

  // Not meant to be called directly from outside the client. Public for testing purposes
  public static async makeRequest(path: string, body: any, authenticated = true) {
    const url = `${ABClient.url}${path}`;
    if (authenticated) body.authKey = ABClient.siteApiKey;
    logger.trace(`AnimeBytes POST ${url} -> ${JSON.stringify(body)}`);
    const res = await ABClient.got(url, {
      method: 'POST',
      json: body,
      responseType: 'text',
    });
    logger.trace(`AnimeBytes POST ${url} <- [${res.statusCode}] ${res.body}`);
    if (Math.floor(res.statusCode / 100) !== 2) throw new Error(`Received HTTP ${res.statusCode} from AB call to ${path}`);
    try {
      return JSON.parse(res.body);
    } catch {
      return res.body;
    }
  }
}
