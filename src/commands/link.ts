import { Parser } from 'htmlparser2';
import { URL } from 'url';
import { StringDecoder } from 'string_decoder';
import gotClient, { Response } from 'got';

import { IRCClient } from '../clients/irc.js';

import { Logger } from '../logger.js';
const logger = Logger.get('LinkCommand');

const MAX_REQUEST_SIZE_BYTES = 1000000;
const MAX_REQUEST_TIME_MS = 10000;

export class LinkCommand {
  private static regex = /https?:\/\/[^#\s]+/gi;

  public static got = gotClient.extend({
    headers: {
      'Accept-Language': 'en-US,en;q=0.7',
      'X-Purpose': 'preview',
      'User-Agent':
        'Mozilla/5.0 (compatible; kana/2.0; +https://github.com/anniemaybytes/kana) facebookexternalhit/1.1 (like Facebot) Twitterbot/1.0',
    },
    throwHttpErrors: false,
    timeout: { request: MAX_REQUEST_TIME_MS },
    retry: { limit: 0 },
  });

  public static async parseTitle(res: Response) {
    return new Promise<string>((resolve) => {
      let titleTag = false;
      let title = '';
      const parser = new Parser(
        {
          onopentagname(name) {
            if (name === 'title' && !title) titleTag = true;
          },
          ontext(text) {
            if (titleTag) title += text;
          },
          onclosetag(name) {
            if (name === 'title') {
              titleTag = false;
              if (title) end();
            }
          },
        },
        { decodeEntities: true },
      );
      const stringDecoder = new StringDecoder();
      const end = () => {
        if (titleTag) resolve(''); // was still parsing title while end was called. Don't resolve half-parsed title
        resolve(title.replace(/\s*\n\s*/g, ' ').trim());
        res.request.destroy();
        stringDecoder.end();
        parser.end();
      };
      let size = 0;
      res.request
        .once('close', end)
        .once('end', end)
        .once('error', end)
        .on('data', (data) => {
          size += data.length;
          if (size > MAX_REQUEST_SIZE_BYTES) end();
          else parser.write(stringDecoder.write(data));
        });
    });
  }

  public static processTitle(title: string) {
    if (!title) return '';
    if (title.length > 100) {
      let i = 100;
      for (; i > 0; i--) {
        if (title[i].match(/\s/)) break;
      }
      return `${title.substring(0, i || 50)}...`;
    } else {
      return title;
    }
  }

  public static register() {
    IRCClient.addMessageHook(LinkCommand.regex, async (event) => {
      if (event.privateMessage) return;
      const urlMatches = event.message.matchAll(LinkCommand.regex);
      const urlSet = new Set<string>();
      for (const match of urlMatches) if (match) urlSet.add(match[0]);
      if (urlSet.size === 0 || urlSet.size > 3) return;
      logger.debug(`Parsing link(s) found in message from ${event.hostname}`);

      await Promise.all(
        [...urlSet].map(async (urlStr) => {
          if (
            urlStr.match(/https?:\/\/(.+\.)?animebytes\.tv/i) ||
            urlStr.match(/\.(png|jpg|jpeg|gif|bmp|webp|webm|mp4|mkv|txt|zip|rar|7z|tar|tar\.gz|tar\.bz|exe|js|css|pdf)/i)
          )
            return;

          // ensure valid URL
          let url: URL;
          try {
            url = new URL(urlStr);
          } catch {
            return;
          }

          return new Promise<void>((resolve) => {
            LinkCommand.got
              .stream(url)
              .on('error', (err) => {
                logger.debug(`HTTP Error fetching link ${err}`);
                resolve();
              })
              .once('response', async (res) => {
                if (Math.floor(res.statusCode / 100) === 2 && res.headers['content-type']?.startsWith('text/html')) {
                  const title = LinkCommand.processTitle(await LinkCommand.parseTitle(res));
                  if (title) event.reply(`Link title: ${title}`);
                } else {
                  res.request.destroy();
                }
                resolve();
              });
          });
        }),
      );
    });
  }
}
