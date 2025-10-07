/**
 * Resolve a boolean option by prioritizing CLI input, then config, then fallback.
 * @param {boolean | undefined} cliValue
 * @param {boolean | undefined} configValue
 * @param {boolean} fallback
 * @returns {boolean}
 */
export function resolveBooleanOption(cliValue, configValue, fallback) {
  if (typeof cliValue === 'boolean') {
    return cliValue
  }

  if (typeof configValue === 'boolean') {
    return configValue
  }

  return fallback
}
