import { beforeAll, afterAll, vi } from 'vitest';

// Global test setup - Mock console methods to reduce noise in tests
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
  log: vi.fn(),
};

// Mock process.exit to prevent Vitest from exiting
const originalExit = process.exit;
process.exit = vi.fn();

// Restore after all tests
afterAll(() => {
  process.exit = originalExit;
});

// Add a placeholder test to prevent "no tests" error
test('setup file loaded successfully', () => {
  expect(true).toBe(true);
}); 