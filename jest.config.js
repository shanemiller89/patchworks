export default {
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(inquirer|@inquirer|inquirer-file-selector|chalk|boxen|ora)/)',
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/(?:src|cli|config|menus|prompts|tasks|utils|bin)/.*)\\.js$': '$1.ts',
  },
  extensionsToTreatAsEsm: ['.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.js'],
};
