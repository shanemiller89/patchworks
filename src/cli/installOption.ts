export function resolveInstallFlag(
  cliValue: boolean | undefined,
  configValue: boolean | undefined,
  defaultValue = true,
): boolean {
  if (typeof cliValue === 'boolean') {
    return cliValue
  }

  if (typeof configValue === 'boolean') {
    return configValue
  }

  return defaultValue
}
