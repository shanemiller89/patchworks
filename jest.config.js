export default {
  testEnvironment: 'node',
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(inquirer|@inquirer|inquirer-file-selector|chalk|boxen|ora)/)',
  ],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.js'],
};
