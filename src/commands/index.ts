import { addLinkWatcher } from './link';
import { listenForEnterMsg } from './enter';
import { listenForIdentifyMsg } from './identify';
import { listenForUser } from './user';

export function addCommands() {
  addLinkWatcher();
  listenForEnterMsg();
  listenForIdentifyMsg();
  listenForUser();
}
