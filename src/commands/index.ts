import { addSongCommands } from './symphogay';
import { addLinkWatcher } from './web';
import { listenForEnterMsg } from './enter';
import { listenForDess } from './dess';
import { listenForUser } from './user';

export function addCommands() {
  addSongCommands();
  addLinkWatcher();
  listenForEnterMsg();
  listenForDess();
  listenForUser();
}
