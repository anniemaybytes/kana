import { IRCClient } from '../clients/irc';
import { StringDecoder } from 'string_decoder';
import fetch from 'node-fetch';
import { Parser } from 'htmlparser2';
import { sleep } from '../utils';
import { getLogger } from '../logger';
const logger = getLogger('LinkCommand');

const MAX_REQUEST_SIZE_BYTES = 1000000;
const MAX_REQUEST_TIME_MS = 10000;

const urlRegex = /(^|[^a-zA-Z0-9])((http|ftp|https):\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-.,@?^=%&amp;:/~+#]*[\w\-@?^=%&amp;/~+#])?)/gi;

const standardRequestOptions = {
  headers: { 'Accept-Language': 'en-US,en;q=0.7', 'User-Agent': 'kana/2.0 (node-fetch) like Twitterbot/1.0' },
  timeout: MAX_REQUEST_TIME_MS,
  size: MAX_REQUEST_SIZE_BYTES,
};

async function parseTitle(htmlBody: NodeJS.ReadStream) {
  let titleTag = false;
  let title = '';
  let bodyClosed = false;
  const parser = new Parser(
    {
      onopentagname(name) {
        if (name === 'title' && !title) titleTag = true;
      },
      ontext(text) {
        if (titleTag) title += text;
      },
      onclosetag(name) {
        if (name === 'title') titleTag = false;
      },
    },
    { decodeEntities: true }
  );
  const stringDecoder = new StringDecoder();
  htmlBody
    .on('data', (data) => {
      parser.write(stringDecoder.write(data));
    })
    .on('close', () => (bodyClosed = true))
    .on('end', () => (bodyClosed = true));
  // Spinlock waiting for body to be finished reading, or until we've found and parsed a title tag
  while (!bodyClosed) {
    if (title && !titleTag) htmlBody.destroy();
    await sleep(0.1);
  }
  stringDecoder.end();
  parser.end();
  return title.replace(/\s*\n\s*/g, ' ').trim();
}

function processTitle(title: string) {
  if (!title) return '';
  if (title.length > 100) {
    let i = 100;
    for (; i > 0; i--) {
      if (title[i].match(/\s/)) break;
    }
    return `${title.substr(0, i || 50)}...`;
  } else {
    return title;
  }
}

export function addLinkWatcher() {
  IRCClient.addMessageHook(urlRegex, async (event) => {
    if (event.privateMessage) return;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const urlMatches = event.message.matchAll(urlRegex); // matchAll is an ES2020 feature supported as of node 12.4.0, however TS target must be 2019, so we ignore this error
    const urlSet = new Set<string>();
    for (const match of urlMatches) if (match) urlSet.add(match[2]);
    if (urlSet.size === 0 || urlSet.size > 3) return;
    logger.debug(`Parsing link(s) found in message from ${event.hostname}`);

    await Promise.all(
      [...urlSet].map(async (url) => {
        if (
          url.match(/https?:\/\/(.+\.)?animebyt(\.es|es\.tv)/i) ||
          url.match(/127\.0\.0\.1/i) ||
          url.match(/\.(png|jpg|jpeg|gif|bmp|webp|webm|mp4|mkv|txt|zip|rar|7z|tar|tar\.gz|tar\.bz|exe|js|css|pdf)/i)
        )
          return;

        try {
          const response = await fetch(url, standardRequestOptions);
          if (!response.ok || !response.headers.get('content-type')?.startsWith('text/html')) return;
          const title = processTitle(await parseTitle(response.body as NodeJS.ReadStream)); // Re-casting because this will be true on nodejs versions >=8
          if (title) event.reply(`Link title: ${title}`);
        } catch (e) {
          // Might be too explicit of a log...
          logger.warn('HTTP Error', e);
        }
      })
    );
  });
}
