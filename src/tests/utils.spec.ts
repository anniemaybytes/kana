import { expect } from 'chai';

import { Utils } from '../utils.js';
import { CustomFailure } from '../errors.js';

describe('Utils', () => {
  describe('parseUserHost', () => {
    it('Returns user and rank for a well formed hostname', () => {
      expect(Utils.parseUserHost('username.LameUser.AnimeBytes')).to.deep.equal({ user: 'username', rank: 'LameUser' });
    });

    it('Throws InvalidABUser with invalid hostnames', () => {
      const invalidHostnames = [
        'my.custom.hostname',
        'username.PowerUser.NotAnimeBytes',
        'PowerUser.AnimeBytes',
        'MyUser.PowerUser',
        '127.0.0.1',
        'extra.user.PowerUser.AnimeBytes',
      ];

      invalidHostnames.forEach((hostName) => {
        try {
          Utils.parseUserHost(hostName);
        } catch (e) {
          expect(e).to.be.instanceOf(CustomFailure);
          return expect(e.code).to.equal('InvalidABUser');
        }
        return expect.fail(`Hostname ${hostName} should have failed, but didn't`);
      });
    });
  });
});
