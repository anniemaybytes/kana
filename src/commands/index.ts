import { addLinkWatcher } from './link';
import { listenForEnterMsg } from './enter';
import { listenForUser } from './user';

export function addCommands() {
  addLinkWatcher();
  listenForEnterMsg();
  listenForUser();
}
