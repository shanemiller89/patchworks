import type { FinalOptions } from '../src/cli/index.js'

export function shouldInstallDependencies(options: FinalOptions): boolean {
  return Boolean(options.install) && !options.reportsOnly
}
