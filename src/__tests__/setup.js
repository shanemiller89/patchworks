// Global test setup
global.console = {
  ...console,
  // Mock console.error to reduce noise in tests
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
};

// Mock process.exit to prevent Jest from exiting
const originalExit = process.exit;
process.exit = jest.fn();

// Restore after all tests
afterAll(() => {
  process.exit = originalExit;
});

// Add a placeholder test to prevent "no tests" error
test('setup file loaded successfully', () => {
  expect(true).toBe(true);
}); 