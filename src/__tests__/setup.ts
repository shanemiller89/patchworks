import { beforeAll, afterAll, vi, test, expect, type Mock } from 'vitest';

// Global test setup - Mock console methods to reduce noise in tests
global.console = {
  ...console,
  error: vi.fn() as Mock,
  warn: vi.fn() as Mock,
  log: vi.fn() as Mock,
};

// Mock process.exit to prevent Vitest from exiting
const originalExit = process.exit;
process.exit = vi.fn() as unknown as typeof process.exit;

// Restore after all tests
afterAll(() => {
  process.exit = originalExit;
});

// Add a placeholder test to prevent "no tests" error
test('setup file loaded successfully', () => {
  expect(true).toBe(true);
});
