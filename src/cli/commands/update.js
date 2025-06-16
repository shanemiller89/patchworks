import { main } from '../../../tasks/main.js';
import { readConfig } from '../../../config/configUtil.js';
import logger from '../../../reports/logger.js';

export default async function (level, options) {
  const config = (await readConfig()) || {};
  const finalOptions = {
    level: level || config.level || 'minor',
    limit: options.limit || config.limit || null,
    levelScope: options.levelScope || config.levelScope || 'strict',
    summary: options.summary || config.summary || false,
    skipped: options.skipped || config.skipped || false,
    install: options.install || config.install || false,
    excludeRepoless: options.excludeRepoless || config.excludeRepoless || false,
    showExcluded: options.showExcluded || config.showExcluded || false,
  };

  try {
    await main(finalOptions);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
}
