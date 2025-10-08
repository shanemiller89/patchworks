import { describe, test, expect, beforeEach, vi, type Mock } from 'vitest';

const mockError: Mock = vi.fn();
const mockSuccess: Mock = vi.fn();

vi.mock('../../reports/logger.js', () => ({
  __esModule: true,
  default: {
    success: mockSuccess,
    error: mockError,
  },
  success: mockSuccess,
  error: mockError,
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
  message: vi.fn(),
  titleHeading: vi.fn(),
  heading: vi.fn(),
  excluding: vi.fn(),
  fallback: vi.fn(),
  separator: vi.fn(),
  skipping: vi.fn(),
  evaluating: vi.fn(),
  logReviewState: vi.fn(),
  packageReport: vi.fn(),
  patchworks: vi.fn(),
}));

vi.mock('../../analysis/analyzeLogData.js', () => ({
  __esModule: true,
  parseIncludedPackage: vi.fn(),
}));

vi.mock('../../versionLogs/fetchChangelog.js', () => ({
  __esModule: true,
  fetchChangelog: vi.fn(),
}));

vi.mock('../../versionLogs/fetchCommits.js', () => ({
  __esModule: true,
  fetchCommits: vi.fn(),
}));

vi.mock('../../versionLogs/fetchReleaseNotes.js', () => ({
  __esModule: true,
  fetchReleaseNotes: vi.fn(),
}));

vi.mock('../../reports/generateReports.js', () => ({
  __esModule: true,
  bundleReports: vi.fn(),
}));

vi.mock('../../utils/updatingHelpers.js', () => ({
  __esModule: true,
  installDependencies: vi.fn(),
  writeChanges: vi.fn(),
}));

vi.mock('../../tasks/versionProcessor/versionProcessor.js', () => ({
  __esModule: true,
  processPackageVersions: vi.fn(),
}));

const mockRun = vi.fn(() => Promise.reject(new Error('Task failure')));

vi.mock('listr2', () => ({
  __esModule: true,
  Listr: vi.fn(() => ({
    run: mockRun,
  })),
  PRESET_TIMER: {},
  color: {
    red: (input: string) => input,
    green: (input: string) => input,
  },
}));

vi.mock('../../prompts/prompts.js', () => ({
  __esModule: true,
  promptUserForReportDirectory: vi.fn(),
  askToContinue: vi.fn(),
}));

vi.mock('../../reports/consoleTaskReports.js', () => ({
  __esModule: true,
  displayResultsTable: vi.fn(),
  customTablePrompt: vi.fn(),
  displayFinalReports: vi.fn(),
}));

type WorkflowOptions = {
  reportsOnly: boolean;
  level: 'patch' | 'minor' | 'major';
  limit: number | null;
  levelScope: 'strict' | 'cascade';
  summary: boolean;
  skipped: boolean;
  write: boolean;
  install: boolean;
  excludeRepoless: boolean;
  debug: boolean;
  showExcluded: boolean;
};

describe('workflow failure handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.DEBUG;
  });

  test('logs an error when tasks reject without DEBUG', async () => {
    const { main } = await import('../../tasks/main.ts');

    const options: WorkflowOptions = {
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
    };

    await main(options);

    expect(mockSuccess).not.toHaveBeenCalled();
    expect(mockError).toHaveBeenCalledWith(
      expect.stringContaining('Workflow failed'),
    );
  });
});
