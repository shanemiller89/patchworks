/**
 * Resolve a boolean option by prioritizing CLI input, then config, then fallback.
 * @param cliValue - CLI flag value
 * @param configValue - Config file value
 * @param fallback - Default fallback value
 * @returns Resolved boolean value
 */
export function resolveBooleanOption(
  cliValue: boolean | undefined,
  configValue: boolean | undefined,
  fallback: boolean
): boolean {
  if (typeof cliValue === 'boolean') {
    return cliValue;
  }

  if (typeof configValue === 'boolean') {
    return configValue;
  }

  return fallback;
}
