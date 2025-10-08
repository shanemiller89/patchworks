import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use Node environment for CLI testing
    environment: 'node',
    
    // Test file patterns
    include: ['src/**/*.test.{js,ts}'],
    
    // Global test setup
    setupFiles: ['./src/__tests__/setup.ts'],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        '**/*.test.js',
        '**/*.test.ts',
      ],
    },
    
    // Test timeout (10 seconds)
    testTimeout: 10000,
    
    // Globals (makes describe, test, expect available without imports)
    globals: true,
  },
});
