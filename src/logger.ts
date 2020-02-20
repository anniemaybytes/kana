import * as log from 'loglevel';

const logger = log.getLogger('kana');
let logLevel: log.LogLevelDesc = 'debug';
if (process.env.LOG_LEVEL) {
  logLevel = process.env.LOG_LEVEL as log.LogLevelDesc;
} else {
  // eslint-disable-next-line no-console
  console.warn('Warning: Environment variable LOG_LEVEL is not set and has been defaulted to debug');
}
logger.setLevel(logLevel);

export default logger;
