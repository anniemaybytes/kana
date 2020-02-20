import { IRCClient } from '../clients/irc';
import { StringDecoder } from 'string_decoder';
import fetch from 'node-fetch';
import logger from '../logger';
import { Parser } from 'htmlparser2';
import { sleep } from '../utils';

const MAX_REQUEST_SIZE_BYTES = 1000000;
const MAX_REQUEST_TIME_MS = 10000;

const urlRegex = /(http|ftp|https):\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-.,@?^=%&amp;:/~+#]*[\w\-@?^=%&amp;/~+#])?/i;

const standardRequestOptions = {
  headers: { 'Accept-Language': 'en-US,en;q=0.7' },
  timeout: MAX_REQUEST_TIME_MS,
  size: MAX_REQUEST_SIZE_BYTES
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
      }
    },
    { decodeEntities: true }
  );
  const stringDecoder = new StringDecoder();
  htmlBody
    .on('data', data => {
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
  return title;
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
  IRCClient.addMessageHook(urlRegex, async event => {
    if (event.privateMessage) return;
    // Unfortunately irc-framework does not have any way to return the match from its regex check,
    // so we must do the regex again here to actually pull the match we're looking for
    const urlMatch = event.message.match(urlRegex);
    if (!urlMatch) return;
    logger.debug(`Link found in message from ${event.hostname}`);
    const url = urlMatch[0];
    if (
      url.match(/https?:\/\/(.+\.)?animebyt(\.es|es\.tv)/i) ||
      url.match(/127\.0\.0\.1/i) ||
      url.match(/\.(png|jpg|jpeg|gif|txt|zip|tar\.bz|js|css|pdf)/)
    )
      return;

    try {
      const response = await fetch(url, standardRequestOptions);
      if (!response.ok || !response.headers.get('content-type')?.startsWith('text/html')) return;
      let title = await parseTitle(response.body as NodeJS.ReadStream); // Re-casting because this will be true on nodejs versions >=8
      title = processTitle(title);
      if (title) event.reply(`Link title: ${title}`);
    } catch (e) {
      // Might be too explicit of a log...
      logger.warn('HTTP Error', e);
    }
  });
}
