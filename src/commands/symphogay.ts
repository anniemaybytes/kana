import { IRCClient } from '../clients/irc';
import logger from '../logger';

const songs = [
  'FINAL COMMANDER by Mizuki Nana ~ https://radio.animebits.moe/player/hash/7c57e488c8c1 ~ https://animebytes.tv/torrents2.php?id=57720',
  'Exterminate by Mizuki Nana ~ https://radio.animebits.moe/player/hash/b92a0114958e ~ https://animebytes.tv/torrents2.php?id=49119',
  'TESTAMENT by Mizuki Nana ~ https://radio.animebits.moe/player/hash/46a2911eb456 ~ https://animebytes.tv/torrents2.php?id=46911',
  'Vitalization by Mizuki Nana ~ https://radio.animebits.moe/player/hash/691e1d8a38da ~ https://animebytes.tv/torrents2.php?id=22995',
  'Synchrogazer by Mizuki Nana ~ https://radio.animebits.moe/player/hash/8fe559c07363 ~ https://animebytes.tv/torrents2.php?id=13534',
  'Vitalization -Aufwachen Form- by Mizuki Nana ~ https://radio.animebits.moe/player/hash/0f8c3c18242d ~ https://animebytes.tv/torrents2.php?id=26608',
  'TESTAMENT -Aufwachen Form- by Mizuki Nana ~ https://radio.animebits.moe/player/hash/a1a5c83493f2 ~ https://animebytes.tv/torrents2.php?id=49119',
  'Synchrogazer -Aufwachen Form- by Mizuki Nana ~ https://radio.animebits.moe/player/hash/81d7bbbacd42 ~ https://animebytes.tv/torrents2.php?id=16863',
  'https://mei.animebytes.tv/D46VG0mwINv.png',
  'UNLIMITED BEAT by Mizuki Nana ~ https://radio.animebits.moe/player/hash/18e18823107f ~ https://animebytes.tv/torrents2.php?id=43365',
  'FINAL COMMANDER -Aufwachen Form- by Mizuki Nana ~ https://radio.animebits.moe/player/hash/9f4ab07bede1 ~ https://animebytes.tv/torrents2.php?id=58724&torrentid=429871'
];

const metanoiaSongs = [
  'METANOIA by Mizuki Nana ~ https://radio.animebits.moe/player/hash/4379a84c66f9 ~ https://animebytes.tv/torrents2.php?id=57062',
  'METANOIA -Aufwachen Form- by Mizuki Nana ~ https://radio.animebits.moe/player/hash/3be87f1f3252 ~ https://animebytes.tv/torrents2.php?id=58724&torrentid=429871'
];

songs.push(...metanoiaSongs);

function pickRandom(array: string[]) {
  return array[Math.floor(Math.random() * array.length)];
}

export function addSongCommands() {
  IRCClient.addMessageHook(/^!nana$/i, event => {
    if (event.privateMessage) return;
    logger.debug(`nana request from ${event.hostname}`);
    event.reply(pickRandom(songs));
  });

  IRCClient.addMessageHook(/^!metanoia$/i, event => {
    if (event.privateMessage) return;
    logger.debug(`metanoia request from ${event.hostname}`);
    event.reply(pickRandom(metanoiaSongs));
  });
}
