import { renderMainMenu } from '../../../menus/mainMenu.js';
import { readConfig } from '../../../config/configUtil.js';
import logger from '../../../reports/logger.js';
import { resolveBooleanOption } from '../booleanOption.js';

export default async function (level, options) {
  const config = (await readConfig()) || {};
  const finalOptions = {
    level: level ?? config.level ?? null,
    limit: options.limit ?? config.limit ?? null,
    levelScope: options.levelScope ?? config.levelScope ?? 'strict',
    summary: resolveBooleanOption(options.summary, config.summary, false),
    skipped: resolveBooleanOption(options.skipped, config.skipped, false),
    install: resolveBooleanOption(options.install, config.install, true),
    excludeRepoless: resolveBooleanOption(
      options.excludeRepoless,
      config.excludeRepoless,
      false,
    ),
    showExcluded: resolveBooleanOption(
      options.showExcluded,
      config.showExcluded,
      false,
    ),
  };

  try {
    await renderMainMenu(finalOptions);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
}
