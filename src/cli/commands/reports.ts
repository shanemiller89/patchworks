import { main } from '../../../tasks/main.js';
import { readConfig, PatchworksConfig } from '../../../config/configUtil.js';
import logger from '../../../reports/logger.js';
import { buildFinalOptions } from '../optionsBuilder.js';

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
  aiSummary?: boolean;
}

export default async function (
  level: 'patch' | 'minor' | 'major',
  options: CommandOptions
): Promise<void> {
  const config: Partial<PatchworksConfig> = (await readConfig()) || {};
  const finalOptions = buildFinalOptions(level, options, config);

  try {
    await main({ reportsOnly: true, ...finalOptions });
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
}
