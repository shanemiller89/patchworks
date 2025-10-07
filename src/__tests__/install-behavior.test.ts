import { resolveInstallFlag } from '../cli/installOption.js'
import type { FinalOptions } from '../cli/index.js'
import { shouldInstallDependencies } from '../../tasks/installGuard.ts'

describe('Install flag resolution', () => {
  test('falls back to config value when CLI flag omitted', () => {
    const result = resolveInstallFlag(undefined, false)
    expect(result).toBe(false)
  })

  test('defaults to true when neither CLI nor config provides a value', () => {
    const result = resolveInstallFlag(undefined, undefined)
    expect(result).toBe(true)
  })
})

describe('Install task execution guard', () => {
  const baseOptions: Omit<FinalOptions, 'install'> = {
    level: null,
    limit: null,
    levelScope: 'strict',
    summary: false,
    skipped: false,
    write: false,
    excludeRepoless: false,
    debug: false,
    showExcluded: false,
  }

  test('skips dependency installation when resolved value is false', () => {
    const options: FinalOptions = {
      ...baseOptions,
      install: resolveInstallFlag(undefined, false),
    }

    expect(shouldInstallDependencies(options)).toBe(false)
  })

  test('runs dependency installation when resolved value is true', () => {
    const options: FinalOptions = {
      ...baseOptions,
      install: resolveInstallFlag(true, false),
    }

    expect(shouldInstallDependencies(options)).toBe(true)
  })
})
