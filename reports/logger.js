import boxen from 'boxen'
import _ from 'lodash'
import { MAIN_TITLE } from '../utils/constants.js'
import { mainTitleOptions, packageReportOptions, styles } from './styles.js'

function summarizeCategorizedNotes(categorizedNotes) {
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
    }
  }

  // Initialize counters for each category
  const categoryTotals = {
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
  }

  // Loop through each categorizedNote and sum up the counts
  for (const note of categorizedNotes) {
    const categories = note.categorized

    for (const [key, value] of Object.entries(categories)) {
      if (Array.isArray(value) && key in categoryTotals) {
        categoryTotals[key] += value.length
      }
    }
  }

  return categoryTotals
}

const generateReport = (pkg) => {
  const { categorizedNotes, metadata } = pkg
  const { current, latest, updateType, updatingDifficulty } = metadata
  const categoryValues = summarizeCategorizedNotes(categorizedNotes)
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
  } = categoryValues

  const report = `
  [ [ ${styles[updateType](_.upperCase(updateType))} ] ]
  ${styles.current(current)}  -->  ${styles.latest(
    latest,
  )} (Updating difficulty of: ${styles.neutral(updatingDifficulty)})

  ${
    breaking_change > 0
      ? styles.breaking('Potential Breaking Changes Detected!')
      : ''
  }
${styles.separator}
  Log Source: ${styles.value(logSource)}
  Breaking Changes: ${styles.error(breaking_change)}
  Features: ${styles.success(feature)}
  Fix: ${styles.value(fix)}
  Deprecations: ${styles.warning(deprecation)}
  Security: ${styles.warning(security)}
  Documentation: ${styles.value(documentation)}
  Performance: ${styles.value(performance)}
  Refactor: ${styles.value(refactor)}
  Chore: ${styles.value(chore)}
  Miscellaneous: ${styles.value(miscellaneous)}
  Fix: ${styles.value(uncategorized)}
  ${styles.separator}
  `
  return report
}

export function patchworks() {
  const titleBox = boxen(MAIN_TITLE, mainTitleOptions)

  console.log(`${styles.info(titleBox)}`)
}

export function packageReport(pkg) {
  const { packageName } = pkg
  const boxOptions = packageReportOptions(packageName)
  const report = generateReport(pkg)
  const reportBox = boxen(report, boxOptions)

  console.log(reportBox)
}

/**
 * Generic Message.
 * @param {string} message - The message to log.
 */
export function message(message) {
  console.log(`${styles.message(message)}`)
}

/**
 * Logs review state messages with optional evaluation states.
 * @param {string} packageName - The name of the package being reviewed.
 * @param {string} state - The review state ('evaluating' or 'skipping').
 * @param {object} [metadata] - Additional metadata, such as version details.
 */
export function logReviewState(packageName, state, metadata = {}) {
  const { reason, current, latest, updateType } = metadata

  if (state === 'evaluating') {
    console.log(
      styles.evaluatingState(
        `[[ == EVALUATING PACKAGE == ]] - [${packageName}]-[${current} -> ${latest}]-[${updateType}]`,
      ),
    )
  } else if (state === 'skipping') {
    console.warn(
      styles.skippingState(
        `[[ == SKIPPING PACKAGE == ]] - [${packageName}]-[${current} -> ${latest}]-[${updateType}]`,
      ),
    )
  }
  console.log(styles.stateMessage(`[ ${reason} ]`))
}

/**
 * Logs informational messages.
 * @param {string} message - The message to log.
 */
export function info(message) {
  console.log(`${styles.info('[INFO]')} ${message}`)
}

/**
 * Logs successful operations.
 * @param {string} message - The success message.
 */
export function success(message) {
  console.log(`${styles.success('[SUCCESS]')} ${message}`)
}

/**
 * Logs warning messages.
 * @param {string} message - The warning message.
 */
export function warn(message) {
  console.warn(`${styles.warning('[WARNING]')} ${message}`)
}

/**
 * Logs error messages.
 * @param {string} message - The error message.
 */
export function error(message) {
  console.error(`${styles.error('[ERROR]')} ${message}`)
}

/**
 * Logs debug messages if DEBUG mode is enabled.
 * @param {string} message - The debug message.
 */
export function debug(message) {
  if (process.env.DEBUG) {
    console.log(`${styles.debug('[DEBUG]')} ${message}`)
  }
}

/**
 * Logs a title or report heading with a dynamic line length.
 * @param {string} title - The title or report name
 */
export function titleHeading(title) {
  const padding = 3 // Padding space on each side of the title
  const totalLength = title.length + padding * 2 + 2 // Adjust for the title, padding, and '=' borders
  const line = '='.repeat(totalLength)

  const paddedTitle = `=   ${title.toUpperCase()}   =`

  console.log(styles.sectionHeader(line))
  console.log(styles.titleHeader(paddedTitle)) // Header content
  console.log(styles.sectionHeader(line))
}

/**
 * Logs a heading for structured output.
 * @param {string} message - The heading message.
 */
export function heading(message) {
  console.log(
    `${styles.sectionHeader(`[ == -- ${message.toUpperCase()} -- == ]`)}`,
  )
}

/**
 * Logs a separator for better readability.
 */
export function separator() {
  console.log(styles.separator)
}

/**
 * Logs skipped state messages for when when using the limit flag.
 * Includes updating difficulty.
 * @param {string} message - The message to log.
 * @param {number} [difficulty] - Optional difficulty score to log.
 * @param {object} [metadata] - Metadata details.
 */
export function skipping({ limit, updateDifficulty }) {
  console.warn(
    `${styles.skipping(
      '[-SKIPPING-]',
    )}  - Update Difficulty Score excludes this package from the ${limit} lowest difficulty updates. -`,
  )
  if (updateDifficulty !== undefined) {
    console.log(
      `    ${styles.neutral('[DIFFICULTY]')} Score: ${updateDifficulty}`,
    )
  }
  // if (Object.keys(metadata).length) {
  //   console.log(
  //     `    ${styles.neutral('[METADATA]')} Details:\n    ${JSON.stringify(
  //       metadata,
  //       null,
  //       2,
  //     )
  //       .split('\n')
  //       .map((line) => `    ${line}`)
  //       .join('\n')}`,
  //   )
  // }
}

/**
 * Logs evaluating state messages for when when using the limit flag.
 * Includes updating difficulty.
 * @param {string} limit - The value from limit flag.
 * @param {number} [updatingDifficulty] - difficulty score to log.
//  * @param {object} [metadata] - Metadata details.
 */
export function evaluating({ limit, updateDifficulty }) {
  console.log(
    `${styles.evaluating(
      '[-EVALUATING-]',
    )} - Update Difficulty Score ranks this package within the ${limit} lowest difficulty updates. -`,
  )
  if (updateDifficulty !== undefined) {
    console.log(
      `    ${styles.neutral('[DIFFICULTY]')} Score: ${updateDifficulty}`,
    )
  }
  // if (Object.keys(metadata).length) {
  //   console.log(
  //     `    ${styles.neutral('[METADATA]')} Details:\n    ${JSON.stringify(
  //       metadata,
  //       null,
  //       2,
  //     )
  //       .split('\n')
  //       .map((line) => `    ${line}`)
  //       .join('\n')}`,
  //   )
  // }
}

/**
 * Logs exclusion state when program is forced to exclude package because of user flag or validation issue.
 * @param {string} packageName - Name of the skipped package.
 * @param {string} reason - Reason for skipping.
//  * @param {object} metadata - Metadata details.
 */
export function excluding(
  packageName,
  opts = { reason: null, metadata: null },
) {
  const { reason, metadata } = opts
  warn(styles.excluding(`[--EXCLUDING--] - ${packageName} -`))
  warn(styles.neutral(`    [REASON] ${reason}`))
  if (metadata?.updatingDifficulty !== undefined) {
    warn(
      styles.neutral(`    [DIFFICULTY] Score: ${metadata.updatingDifficulty}`),
    )
  }
  warn(
    styles.neutral(
      `    [METADATA] Details:\n    ${JSON.stringify(metadata, null, 2)
        .split('\n')
        .map((line) => `    ${line}`)
        .join('\n')}`,
    ),
  )
}

/**
 * Logs fallback usage for specific metadata fields.
 * @param {string} field - The metadata field that used a fallback.
 * @param {string} fallback - The fallback value used.
 */
export function fallback(field, fallback) {
  console.log(
    `${styles.fallback(
      '[-FALLBACK-]',
    )} Using fallback for metadata field "${field}": Fallback value -> ${fallback}`,
  )
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
}

export default logger
