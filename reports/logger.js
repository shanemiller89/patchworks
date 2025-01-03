import { styles } from './styles.js'

/**
 * Logs informational messages with optional evaluation states.
 * @param {string} message - The message to log.
 * @param {string} [optionalEvalState] - Optional state (e.g., 'skipping', 'evaluating').
 */
export function info(message, optionalEvalState) {
  let state = ''
  switch (optionalEvalState) {
    case 'skipping':
      state = styles.warning('[SKIPPING]')
      break
    case 'evaluating':
      state = styles.success('[EVALUATING]')
      break
    default:
      state = ''
  }
  console.log(`${styles.headers('[INFO]')} ${state} ${message}`)
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
    console.log(`${styles.neutral('[DEBUG]')} ${message}`)
  }
}

/**
 * Logs a heading for structured output.
 * @param {string} message - The heading message.
 */
export function heading(message) {
  console.log(`${styles.headers('----')} ${message}`)
}

/**
 * Logs skipped packages with metadata details.
 * @param {string} packageName - Name of the skipped package.
 * @param {string} reason - Reason for skipping.
 * @param {object} metadata - Metadata details.
 */
export function excluding(packageName, reason, metadata) {
  warn(`Skipped Package: ${packageName}`)
  warn(`Reason: ${reason}`)
  info(`Metadata: ${JSON.stringify(metadata, null, 2)}`)
}

/**
 * Logs fallback usage for specific metadata fields.
 * @param {string} field - The metadata field that used a fallback.
 * @param {string} fallback - The fallback value used.
 */
export function fallback(field, fallback) {
  info(
    `Using fallback for metadata field '${field}': Fallback value -> ${fallback}`,
  )
}

/**
 * Logs a separator for better readability.
 */
export function separator() {
  console.log(styles.separator)
}

/**
 * Logs skipped state messages.
 * @param {string} message - The message to log.
 */
export function skipping(message) {
  console.log(`${styles.error('[SKIPPING]')}  ${message}`)
}

/**
 * Logs evaluating state messages.
 * @param {string} message - The message to log.
 */
export function evaluating(message) {
  console.log(`${styles.success('[EVALUATING]')}  ${message}`)
}

const logger = {
  info,
  success,
  error,
  debug,
  warn,
  heading,
  excluding,
  fallback,
  separator,
  skipping,
  evaluating,
}

export default logger
