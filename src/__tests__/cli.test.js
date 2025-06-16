jest.mock('../cli/commands/update.js', () => ({}), { virtual: true });
jest.mock('../cli/commands/reports.js', () => ({}), { virtual: true });
jest.mock('../cli/commands/menu.js', () => ({}), { virtual: true });
jest.mock('chalk', () => ({}));
jest.mock('commander', () => ({}));

import cli from '../cli/index.js';

describe('CLI entry', () => {
  test('exports a function', () => {
    expect(typeof cli).toBe('function');
  });
});
