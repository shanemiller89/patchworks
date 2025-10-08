import { describe, test, expect } from 'vitest';
import { resolveBooleanOption } from '../cli/booleanOption.js';

type CLIOptions = {
  install: boolean;
};

type Config = {
  install: boolean;
};

describe('install option merging', () => {
  test('keeps install false and skips install task when disabled in CLI and config', () => {
    const cliOptions: CLIOptions = { install: false };
    const config: Config = { install: false };

    const install = resolveBooleanOption(cliOptions.install, config.install, true);
    const reportsOnly = false;

    expect(install).toBe(false);
    expect(install && !reportsOnly).toBe(false);
  });
});
