import boxen from 'boxen';
import _ from 'lodash';
import { MAIN_TITLE } from '../utils/constants.js';
import { mainTitleOptions, packageReportOptions, styles } from './styles.js';

interface CategorizedNoteCategories {
  breaking_change?: string[];
  feature?: string[];
  fix?: string[];
  deprecation?: string[];
  security?: string[];
  documentation?: string[];
  performance?: string[];
  refactor?: string[];
  chore?: string[];
  miscellaneous?: string[];
  uncategorized?: string[];
  [key: string]: string[] | undefined;
}

interface CategorizedNote {
  logSource?: string;
  categorized: CategorizedNoteCategories;
}

interface CategoryTotals {
  logSource: string | null;
  breaking_change: number | null;
  feature: number | null;
  fix: number | null;
  deprecation: number | null;
  security: number | null;
  documentation: number | null;
  performance: number | null;
  refactor: number | null;
  chore: number | null;
  miscellaneous: number | null;
  uncategorized: number | null;
}

interface PackageMetadata {
  current: string;
  latest: string;
  updateType: 'patch' | 'minor' | 'major';
  updatingDifficulty: number | string;
  [key: string]: any;
}

interface Package {
  packageName: string;
  categorizedNotes?: CategorizedNote[] | null;
  metadata: PackageMetadata;
}

interface ReviewMetadata {
  reason?: string;
  current?: string;
  latest?: string;
  updateType?: string;
  levelScope?: string;
  [key: string]: any;
}

interface DifficultyOptions {
  limit?: number | null;
  updateDifficulty?: number | string;
}

interface ExcludingOptions {
  reason?: string | null;
  metadata?: {
    updatingDifficulty?: number | string;
    [key: string]: any;
  } | null;
}

/**
 * Summarizes categorized notes by counting the number of entries in each category.
 * Returns an object with totals for each category.
 * @param categorizedNotes - An array of categorized notes.
 * @returns An object with totals for each category.
 */
export function summarizeCategorizedNotes(
  categorizedNotes?: CategorizedNote[] | null
): CategoryTotals {
  if (!categorizedNotes || categorizedNotes.length === 0) {
    // Return null values if categorizedNotes is null or empty
    return {
      logSource: null,
      breaking_change: null,
      feature: null,
      fix: null,
      deprecation: null,
      security: null,
      documentation: null,
      performance: null,
      refactor: null,
      chore: null,
      miscellaneous: null,
      uncategorized: null,
    };
  }

  // Initialize counters for each category
  const categoryTotals: CategoryTotals = {
    logSource: categorizedNotes[0].logSource || null,
    breaking_change: 0,
    feature: 0,
    fix: 0,
    deprecation: 0,
    security: 0,
    documentation: 0,
    performance: 0,
    refactor: 0,
    chore: 0,
    miscellaneous: 0,
    uncategorized: 0,
  };

  // Loop through each categorizedNote and sum up the counts
  for (const note of categorizedNotes) {
    const categories = note.categorized;

    for (const [key, value] of Object.entries(categories)) {
      if (Array.isArray(value) && key in categoryTotals) {
        (categoryTotals as any)[key] += value.length;
      }
    }
  }

  return categoryTotals;
}

const generateReport = (pkg: Package): string => {
  const { categorizedNotes, metadata } = pkg;
  const { current, latest, updateType, updatingDifficulty } = metadata;
  const categoryValues = summarizeCategorizedNotes(categorizedNotes);
  const {
    logSource,
    breaking_change,
    feature,
    fix,
    deprecation,
    security,
    documentation,
    performance,
    refactor,
    chore,
    miscellaneous,
    uncategorized,
  } = categoryValues;

  const report = `
  [ [ ${styles[updateType](_.upperCase(updateType))} ] ]
  ${styles.current(current)}  -->  ${styles.latest(
    latest
  )} (Updating difficulty of: ${styles.neutral(String(updatingDifficulty))})

  ${
    breaking_change && breaking_change > 0
      ? styles.breaking('Potential Breaking Changes Detected!')
      : ''
  }
${styles.separator}
  Log Source: ${styles.value(String(logSource))}
  Breaking Changes: ${styles.error(String(breaking_change))}
  Features: ${styles.success(String(feature))}
  Fix: ${styles.value(String(fix))}
  Deprecations: ${styles.warning(String(deprecation))}
  Security: ${styles.warning(String(security))}
  Documentation: ${styles.value(String(documentation))}
  Performance: ${styles.value(String(performance))}
  Refactor: ${styles.value(String(refactor))}
  Chore: ${styles.value(String(chore))}
  Miscellaneous: ${styles.value(String(miscellaneous))}
  Uncategorized: ${styles.value(String(uncategorized))}
  ${styles.separator}
  `;
  return report;
};

export function patchworks(): void {
  const titleBox = boxen(MAIN_TITLE, mainTitleOptions);

  console.log(`${styles.info(titleBox)}`);
}

export function packageReport(pkg: Package): void {
  const { packageName } = pkg;
  const boxOptions = packageReportOptions(packageName);
  const report = generateReport(pkg);
  const reportBox = boxen(report, boxOptions);

  console.log(reportBox);
}

/**
 * Generic Message.
 * @param message - The message to log.
 */
export function message(message: string): void {
  if (process.env.DEBUG) {
    console.log(`${styles.message(message)}`);
  }
}

/**
 * Logs review state messages with optional evaluation states.
 * @param packageName - The name of the package being reviewed.
 * @param state - The review state ('evaluating' or 'skipping').
 * @param metadata - Additional metadata, such as version details.
 */
export function logReviewState(
  packageName: string,
  state: 'evaluating' | 'skipping',
  metadata: ReviewMetadata = {}
): void {
  if (process.env.DEBUG) {
    const { reason, current, latest, updateType } = metadata;

    if (state === 'evaluating') {
      console.log(
        styles.evaluatingState(
          `[[ == EVALUATING PACKAGE == ]] - [${packageName}]-[${current} -> ${latest}]-[${updateType}]`
        )
      );
    } else if (state === 'skipping') {
      console.warn(
        styles.skippingState(
          `[[ == SKIPPING PACKAGE == ]] - [${packageName}]-[${current} -> ${latest}]-[${updateType}]`
        )
      );
    }
    console.log(styles.stateMessage(`[ ${reason} ]`));
  }
}

/**
 * Logs informational messages.
 * @param message - The message to log.
 */
export function info(message: string): void {
  if (process.env.DEBUG) {
    console.log(`${styles.info('[INFO]')} ${message}`);
  }
}

/**
 * Logs successful operations.
 * @param message - The success message.
 */
export function success(message: string): void {
  console.log(`${styles.success('[SUCCESS]')} ${message}`);
}

/**
 * Logs warning messages.
 * @param message - The warning message.
 */
export function warn(message: string): void {
  console.warn(`${styles.warning('[WARNING]')} ${message}`);
}

/**
 * Logs error messages.
 * @param message - The error message.
 */
export function error(message: string): void {
  console.error(`${styles.error('[ERROR]')} ${message}`);
}

/**
 * Logs debug messages if DEBUG mode is enabled.
 * @param message - The debug message.
 */
export function debug(message: string): void {
  if (process.env.DEBUG) {
    console.log(`${styles.debug('[DEBUG]')} ${message}`);
  }
}

/**
 * Logs a title or report heading with a dynamic line length.
 * @param title - The title or report name
 */
export function titleHeading(title: string): void {
  if (process.env.DEBUG) {
    const padding = 3; // Padding space on each side of the title
    const totalLength = title.length + padding * 2 + 2; // Adjust for the title, padding, and '=' borders
    const line = '='.repeat(totalLength);

    const paddedTitle = `=   ${title.toUpperCase()}   =`;

    console.log(styles.sectionHeader(line));
    console.log(styles.titleHeader(paddedTitle)); // Header content
    console.log(styles.sectionHeader(line));
  }
}

/**
 * Logs a heading for structured output.
 * @param message - The heading message.
 */
export function heading(message: string): void {
  if (process.env.DEBUG) {
    console.log(
      `${styles.sectionHeader(`[ == -- ${message.toUpperCase()} -- == ]`)}`
    );
  }
}

/**
 * Logs a separator for better readability.
 */
export function separator(): void {
  if (process.env.DEBUG) {
    console.log(styles.separator);
  }
}

/**
 * Logs skipped state messages for when using the limit flag.
 * Includes updating difficulty.
 * @param options - Options containing limit and updateDifficulty.
 */
export function skipping({ limit, updateDifficulty }: DifficultyOptions): void {
  if (process.env.DEBUG) {
    console.warn(
      `${styles.skipping(
        '[-SKIPPING-]'
      )}  - Update Difficulty Score excludes this package from the ${limit} lowest difficulty updates. -`
    );
    if (updateDifficulty !== undefined) {
      console.log(
        `    ${styles.neutral('[DIFFICULTY]')} Score: ${updateDifficulty}`
      );
    }
  }
}

/**
 * Logs evaluating state messages for when using the limit flag.
 * Includes updating difficulty.
 * @param options - Options containing limit and updateDifficulty.
 */
export function evaluating({ limit, updateDifficulty }: DifficultyOptions): void {
  if (process.env.DEBUG) {
    console.log(
      `${styles.evaluating(
        '[-EVALUATING-]'
      )} - Update Difficulty Score ranks this package within the ${limit} lowest difficulty updates. -`
    );
    if (updateDifficulty !== undefined) {
      console.log(
        `    ${styles.neutral('[DIFFICULTY]')} Score: ${updateDifficulty}`
      );
    }
  }
}

/**
 * Logs exclusion state when program is forced to exclude package because of user flag or validation issue.
 * @param packageName - Name of the skipped package.
 * @param opts - Options containing reason and metadata.
 */
export function excluding(
  packageName: string,
  opts: ExcludingOptions = { reason: null, metadata: null }
): void {
  if (process.env.DEBUG) {
    const { reason, metadata } = opts;
    warn(styles.excluding(`[--EXCLUDING--] - ${packageName} -`));
    warn(styles.neutral(`    [REASON] ${reason}`));
    if (metadata?.updatingDifficulty !== undefined) {
      warn(
        styles.neutral(
          `    [DIFFICULTY] Score: ${metadata.updatingDifficulty}`
        )
      );
    }
    warn(
      styles.neutral(
        `    [METADATA] Details:\n    ${JSON.stringify(metadata, null, 2)
          .split('\n')
          .map((line) => `    ${line}`)
          .join('\n')}`
      )
    );
  }
}

/**
 * Logs fallback usage for specific metadata fields.
 * @param field - The metadata field that used a fallback.
 * @param fallbackValue - The fallback value used.
 */
export function fallback(field: string, fallbackValue: string): void {
  if (process.env.DEBUG) {
    console.log(
      `${styles.fallback(
        '[-FALLBACK-]'
      )} Using fallback for metadata field "${field}": Fallback value -> ${fallbackValue}`
    );
  }
}

const logger = {
  packageReport,
  patchworks,
  message,
  info,
  success,
  error,
  debug,
  warn,
  titleHeading,
  heading,
  excluding,
  fallback,
  separator,
  skipping,
  evaluating,
  logReviewState,
};

export default logger;
