const mockError = jest.fn()
const mockSuccess = jest.fn()

jest.doMock('../../reports/logger.js', () => ({
  __esModule: true,
  default: {
    success: mockSuccess,
    error: mockError,
  },
  success: mockSuccess,
  error: mockError,
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  message: jest.fn(),
  titleHeading: jest.fn(),
  heading: jest.fn(),
  excluding: jest.fn(),
  fallback: jest.fn(),
  separator: jest.fn(),
  skipping: jest.fn(),
  evaluating: jest.fn(),
  logReviewState: jest.fn(),
  packageReport: jest.fn(),
  patchworks: jest.fn(),
}))

jest.doMock('../../analysis/analyzeLogData.js', () => ({
  __esModule: true,
  parseIncludedPackage: jest.fn(),
}))

jest.doMock('../../versionLogs/fetchChangelog.js', () => ({
  __esModule: true,
  fetchChangelog: jest.fn(),
}))

jest.doMock('../../versionLogs/fetchCommits.js', () => ({
  __esModule: true,
  fetchCommits: jest.fn(),
}))

jest.doMock('../../versionLogs/fetchReleaseNotes.js', () => ({
  __esModule: true,
  fetchReleaseNotes: jest.fn(),
}))

jest.doMock('../../reports/generateReports.js', () => ({
  __esModule: true,
  bundleReports: jest.fn(),
}))

jest.mock(
  '../../utils/updatingHelpers.js',
  () => ({
    __esModule: true,
    installDependencies: jest.fn(),
    writeChanges: jest.fn(),
  }),
  { virtual: true },
)

jest.doMock('../../tasks/versionProcessor/versionProcessor.js', () => ({
  __esModule: true,
  processPackageVersions: jest.fn(),
}))

const mockRun = jest.fn(() => Promise.reject(new Error('Task failure')))

jest.unstable_mockModule('listr2', () => ({
  __esModule: true,
  Listr: jest.fn(() => ({
    run: mockRun,
  })),
  PRESET_TIMER: {},
  color: {
    red: (input) => input,
    green: (input) => input,
  },
}))

jest.mock(
  '../../prompts/prompts.js',
  () => ({
    __esModule: true,
    promptUserForReportDirectory: jest.fn(),
    askToContinue: jest.fn(),
  }),
  { virtual: true },
)

jest.mock(
  '../../reports/consoleTaskReports.js',
  () => ({
    __esModule: true,
    displayResultsTable: jest.fn(),
    customTablePrompt: jest.fn(),
    displayFinalReports: jest.fn(),
  }),
  { virtual: true },
)

describe('workflow failure handling', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    delete process.env.DEBUG
  })

  test('logs an error when tasks reject without DEBUG', async () => {
    const { main } = await import('../../tasks/main.ts')

    await main({
      reportsOnly: false,
      level: 'minor',
      limit: null,
      levelScope: 'strict',
      summary: false,
      skipped: false,
      write: false,
      install: false,
      excludeRepoless: false,
      debug: false,
      showExcluded: false,
    })

    expect(mockSuccess).not.toHaveBeenCalled()
    expect(mockError).toHaveBeenCalledWith(
      expect.stringContaining('Workflow failed'),
    )
  })
})
