import { jest } from '@jest/globals'

const createChalkMock = () => {
  const handler = {
    apply: (_target, _thisArg, args) => args[0],
    get: (_target, _prop) => proxy,
  }
  const proxy = new Proxy(() => '', handler)
  return proxy
}

const mockChalk = createChalkMock()

jest.mock('chalk', () => ({
  __esModule: true,
  default: mockChalk,
}))

jest.mock('@inquirer/core', () => ({
  createPrompt: jest.fn(),
  isDownKey: jest.fn(),
  isEnterKey: jest.fn(),
  isSpaceKey: jest.fn(),
  isUpKey: jest.fn(),
  useKeypress: jest.fn(),
  usePrefix: jest.fn(),
  useState: jest.fn(() => [0, jest.fn()]),
}))

jest.mock(
  '../../utils/constants.js',
  () => ({
    __esModule: true,
    SKIPPED: 'SKIPPED',
    UNKNOWN: 'UNKNOWN',
  }),
  { virtual: true },
)

jest.mock(
  '../../reports/styles.js',
  () => ({
    styles: new Proxy(
      {},
      {
        get: () => (value) => value,
      },
    ),
  }),
  { virtual: true },
)

jest.mock(
  '../../utils/TableGenerator.js',
  () => ({
    TableGenerator: class {
      constructor(_headers, data) {
        this.data = data
      }

      generateTable() {
        return this.data
          .map((row) =>
            row
              .map((cell) => {
                if (cell.type === 'boolean') {
                  return cell.value ? '✓' : '✗'
                }
                return cell.value ?? '-'
              })
              .join('|'),
          )
          .join('\n')
      }
    },
  }),
  { virtual: true },
)

const stripAnsi = (input) => input.replace(/\u001b\[[0-9;]*m/g, '')

const modulePromise = import('../../reports/consoleTaskReports.js')

let displayIncludedPackages
let displayResultsTable

describe('consoleTaskReports compatibility flags', () => {
  let originalColumns

  beforeAll(async () => {
    const module = await modulePromise
    displayIncludedPackages = module.displayIncludedPackages
    displayResultsTable = module.displayResultsTable

    originalColumns = process.stdout.columns
    process.stdout.columns = 120
  })

  afterAll(() => {
    process.stdout.columns = originalColumns
  })

  test('displayIncludedPackages renders true compatibility flags as true', async () => {
    const includedPackages = [
      {
        packageName: 'test-package',
        metadata: {
          current: '1.0.0',
          wanted: '1.0.1',
          latest: '1.1.0',
          updateType: 'minor',
          updatingDifficulty: 'moderate',
          githubUrl: 'https://github.com/test/test-package',
          releaseNotesCompatible: true,
          fallbackACompatible: true,
          fallbackBCompatible: true,
          homepage: 'https://example.com',
        },
      },
    ]

    const output = await displayIncludedPackages(includedPackages)
    const cleanOutput = stripAnsi(output)
    const checkmarks = cleanOutput.match(/✓/g) || []

    expect(checkmarks.length).toBe(3)
  })

  test('displayResultsTable renders true compatibility flags as true', async () => {
    const packages = [
      {
        packageName: 'test-package',
        metadata: {
          current: '1.0.0',
          latest: '1.1.0',
          updateType: 'minor',
          githubUrl: 'https://github.com/test/test-package',
          fallbackUrl: 'https://example.com/fallback',
          releaseNotesCompatible: true,
          fallbackACompatible: true,
          fallbackBCompatible: true,
        },
        changelog: 'Changelog details',
        releaseNotes: [{ notes: 'Release note details' }],
        source: 'npm',
        attemptedReleaseNotes: false,
        attemptedFallbackA: false,
        attemptedFallbackB: false,
      },
    ]

    const output = await displayResultsTable(packages)
    const cleanOutput = stripAnsi(output)
    const checkmarks = cleanOutput.match(/✓/g) || []

    expect(checkmarks.length).toBe(3)
  })
})
