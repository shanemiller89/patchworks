import { describe, test, expect, beforeAll, beforeEach, afterAll, vi, type Mock } from 'vitest';

const mockBoxen: Mock = vi.fn();

vi.mock('../../reports/styles.js', () => ({
  __esModule: true,
  styles: {
    success: (msg: string) => msg,
    warning: (msg: string) => msg,
    error: (msg: string) => msg,
    debug: (msg: string) => msg,
    info: (msg: string) => msg,
    message: (msg: string) => msg,
    separator: '',
  },
  mainTitleOptions: {},
  packageReportOptions: () => ({}),
}));

vi.mock('boxen', () => ({
  __esModule: true,
  default: mockBoxen,
}));

type Logger = {
  error: (message: string) => void;
  warn: (message: string) => void;
  success: (message: string) => void;
  debug: (message: string) => void;
  info?: (message: string) => void;
  message?: (message: string) => void;
};

describe('logger output behaviour', () => {
  let logger: Logger;
  const originalDebug = process.env.DEBUG;

  beforeAll(async () => {
    const module = await import('../../reports/logger.js');
    logger = module.default;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.DEBUG;
  });

  afterAll(() => {
    if (originalDebug === undefined) {
      delete process.env.DEBUG;
    } else {
      process.env.DEBUG = originalDebug;
    }
  });

  test('error logs without DEBUG flag', () => {
    logger.error('Test error message');

    expect(console.error).toHaveBeenCalledTimes(1);
    const consoleMock = console.error as Mock;
    const firstCall = consoleMock.mock.calls[0];
    expect(firstCall[0]).toContain('[ERROR]');
  });

  test('warn logs without DEBUG flag', () => {
    logger.warn('Test warning message');

    expect(console.warn).toHaveBeenCalledTimes(1);
    const consoleMock = console.warn as Mock;
    const firstCall = consoleMock.mock.calls[0];
    expect(firstCall[0]).toContain('[WARNING]');
  });

  test('success logs without DEBUG flag', () => {
    logger.success('Test success message');

    expect(console.log).toHaveBeenCalledTimes(1);
    const consoleMock = console.log as Mock;
    const firstCall = consoleMock.mock.calls[0];
    expect(firstCall[0]).toContain('[SUCCESS]');
  });

  test('debug remains silent without DEBUG flag', () => {
    logger.debug('Detailed debug message');

    expect(console.log).not.toHaveBeenCalled();
  });
});
