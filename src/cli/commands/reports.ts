import { main } from '../../../tasks/main.js';
import { readConfig, PatchworksConfig } from '../../../config/configUtil.js';
import logger from '../../../reports/logger.js';
import { resolveBooleanOption } from '../booleanOption.js';
import { FinalOptions } from '../index.js';

interface CommandOptions {
  limit?: number;
  levelScope?: 'strict' | 'cascade';
  summary?: boolean;
  skipped?: boolean;
  write?: boolean;
  install?: boolean;
  excludeRepoless?: boolean;
  debug?: boolean;
  showExcluded?: boolean;
}

export default async function (
  level: 'patch' | 'minor' | 'major',
  options: CommandOptions
): Promise<void> {
  const config: Partial<PatchworksConfig> = (await readConfig()) || {};
  const finalOptions: FinalOptions = {
    level: level ?? config.level ?? 'minor',
    limit: options.limit ?? config.limit ?? null,
    levelScope: options.levelScope ?? config.levelScope ?? 'strict',
    summary: resolveBooleanOption(options.summary, config.summary, false),
    skipped: resolveBooleanOption(options.skipped, config.skipped, false),
    write: resolveBooleanOption(options.write, config.write, false),
    install: resolveBooleanOption(options.install, config.install, true),
    excludeRepoless: resolveBooleanOption(
      options.excludeRepoless,
      config.excludeRepoless,
      false
    ),
    debug: resolveBooleanOption(options.debug, config.debug, false),
    showExcluded: resolveBooleanOption(
      options.showExcluded,
      config.showExcluded,
      false
    ),
  };

  try {
    await main({ reportsOnly: true, ...finalOptions });
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
}
