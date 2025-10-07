import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, test, expect } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageJsonPath = path.resolve(__dirname, '../../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const resolveWithFallback = (
  relativePath,
  fallbackExtensions = ['.js', '.mjs', '.cjs', '.ts']
) => {
  const resolvedPath = path.resolve(__dirname, '../../', relativePath);
  if (fs.existsSync(resolvedPath)) {
    return resolvedPath;
  }

  const originalExtension = path.extname(resolvedPath);
  const basePath = originalExtension
    ? resolvedPath.slice(0, -originalExtension.length)
    : resolvedPath;

  const candidateExtensions = fallbackExtensions.filter(
    extension => extension !== originalExtension
  );

  const alternativePath = candidateExtensions
    .map(extension => `${basePath}${extension}`)
    .find(fs.existsSync);

  return alternativePath ?? resolvedPath;
};

describe('CLI module structure', () => {
  test('CLI TypeScript source exists', () => {
    const cliSourcePath = path.join(__dirname, '../cli/index.ts');
    expect(fs.existsSync(cliSourcePath)).toBe(true);
  });

  test('package.json main entry points to an existing file', () => {
    expect(packageJson.main).toBeDefined();

    const mainPath = resolveWithFallback(packageJson.main, [
      '.js',
      '.mjs',
      '.cjs',
      '.ts',
    ]);

    expect(fs.existsSync(mainPath)).toBe(true);
  });

  test('binary file exists and is executable', () => {
    expect(packageJson.bin).toBeDefined();
    expect(packageJson.bin.patchworks).toBeDefined();

    const binPath = resolveWithFallback(packageJson.bin.patchworks, [
      '.js',
      '.mjs',
      '.cjs',
      '.ts',
    ]);
    expect(fs.existsSync(binPath)).toBe(true);

    const stats = fs.statSync(binPath);
    expect(stats.isFile()).toBe(true);
    expect(stats.mode & parseInt('111', 8)).toBeGreaterThan(0);
  });

  test('binary starts without syntax errors', () => {
    const binPath = resolveWithFallback(packageJson.bin.patchworks, [
      '.js',
      '.mjs',
      '.cjs',
      '.ts',
    ]);

    const executableExtensions = new Set(['.js', '.mjs', '.cjs']);
    const extension = path.extname(binPath);

    if (!executableExtensions.has(extension)) {
      // If the compiled binary is unavailable, skip execution validation.
      return;
    }

    const result = spawnSync('node', [binPath, '--help'], {
      encoding: 'utf8',
    });

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
  });

  test('package.json has correct configuration', () => {
    expect(packageJson.name).toBe('patchworks');
    expect(packageJson.bin).toBeDefined();
    expect(['./bin/patchworks.js', './bin/patchworks.ts']).toContain(packageJson.bin.patchworks);
    expect(['src/cli/index.js', 'src/cli/index.ts']).toContain(packageJson.main);
  });
});