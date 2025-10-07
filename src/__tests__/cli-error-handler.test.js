import { describe, test, expect, beforeAll, beforeEach, vi } from 'vitest';

const mockLoggerError = vi.fn();

let createOutputErrorHandler;

beforeAll(async () => {
  vi.resetModules();

  vi.mock('../../reports/logger.js', () => ({
    __esModule: true,
    default: {
      error: mockLoggerError,
      warn: vi.fn(),
      success: vi.fn(),
    },
    error: mockLoggerError,
    warn: vi.fn(),
    success: vi.fn(),
  }));

  ({ createOutputErrorHandler } = await import('../cli/errorHandler.ts'));
});

describe('createOutputErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.DEBUG;
  });

  test('logs errors via logger and triggers help', () => {
    const help = vi.fn();
    const write = vi.fn();
    const handler = createOutputErrorHandler({ help });

    handler('  error: unknown command invalid\n', write);

    expect(write).toHaveBeenCalledWith('');
    expect(mockLoggerError).toHaveBeenCalledWith(
      'error: unknown command invalid',
    );
    expect(help).toHaveBeenCalled();
    expect(process.env.DEBUG).toBeUndefined();
  });
});
