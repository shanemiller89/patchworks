import { resolveBooleanOption } from './booleanOption.js';
import { PatchworksConfig } from '../../config/configUtil.js';
import { FinalOptions } from './index.js';

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

/**
 * Builds final options by merging CLI options with config file values
 * @param level - The version update level
 * @param options - CLI command options
 * @param config - Config file values
 * @param overrides - Optional overrides for specific options
 * @returns Final options with all values resolved
 */
export function buildFinalOptions(
  level: 'patch' | 'minor' | 'major' | null | undefined,
  options: CommandOptions,
  config: Partial<PatchworksConfig>,
  overrides?: Partial<FinalOptions>
): FinalOptions {
  return {
    level: level ?? config.level ?? null,
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
    aiSummary: resolveBooleanOption(
      options.aiSummary,
      config.ai?.enabled,
      false
    ),
    ...overrides,
  };
}
