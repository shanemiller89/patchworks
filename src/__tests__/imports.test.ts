import { describe, test, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type ModuleInfo = {
  name: string;
  path: string;
};

describe('Import Verification Tests', () => {
  const keyModules: ModuleInfo[] = [
    { name: 'Config Utility', path: '../../config/configUtil' },
    { name: 'Constants', path: '../../utils/constants' },
    { name: 'Alignment Helpers', path: '../../utils/alignmentHelpers' },
    { name: 'Analysis - Categorize Logs', path: '../../analysis/categorizeLogs' },
    { name: 'Analysis - Compute TFIDF', path: '../../analysis/computeTFIDFRanking' },
    { name: 'Prompts - Base Toggle', path: '../../prompts/baseToggle' },
    { name: 'Version Logs - Fetch Changelog', path: '../../versionLogs/fetchChangelog' }
  ];

  describe('File existence validation', () => {
    keyModules.forEach(({ name, path: modulePath }) => {
      test(`${name} file should exist`, () => {
        const resolvedPath = path.resolve(__dirname, modulePath);
        const extensions = ['.ts', '.js', '.mjs', '.cjs'];
        const fileExists = extensions.some(extension =>
          fs.existsSync(`${resolvedPath}${extension}`)
        );
        expect(fileExists).toBe(true);
      });
    });
  });

  describe('Entry point validation', () => {
    test('package.json main entry point exists', () => {
      const packageJsonPath = path.resolve(__dirname, '../../package.json');
      const packageJson: { main: string } = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      const mainPath = path.resolve(__dirname, '../../', packageJson.main);
      expect(fs.existsSync(mainPath)).toBe(true);
    });

    test('binary entry point exists and is executable', () => {
      const packageJsonPath = path.resolve(__dirname, '../../package.json');
      const packageJson: { bin: { patchworks: string } } = JSON.parse(
        fs.readFileSync(packageJsonPath, 'utf8')
      );
      
      const binPath = path.resolve(__dirname, '../../', packageJson.bin.patchworks);
      expect(fs.existsSync(binPath)).toBe(true);
      
      const stats = fs.statSync(binPath);
      expect(stats.mode & parseInt('111', 8)).toBeGreaterThan(0);
    });
  });

  describe('Directory structure validation', () => {
    const requiredDirectories: string[] = [
      'src/cli',
      'config',
      'utils', 
      'analysis',
      'menus',
      'prompts',
      'reports',
      'tasks',
      'versionLogs'
    ];

    requiredDirectories.forEach(dir => {
      test(`${dir} directory should exist`, () => {
        const dirPath = path.resolve(__dirname, '../../', dir);
        expect(fs.existsSync(dirPath)).toBe(true);
        expect(fs.statSync(dirPath).isDirectory()).toBe(true);
      });
    });
  });

  describe('Critical files validation', () => {
    const criticalFiles: string[] = [
      'package.json',
      'LICENSE',
      'README.md',
      '.npmignore',
      'vitest.config.js'  // Changed from jest.config.js
    ];

    criticalFiles.forEach(file => {
      test(`${file} should exist`, () => {
        const filePath = path.resolve(__dirname, '../../', file);
        expect(fs.existsSync(filePath)).toBe(true);
        expect(fs.statSync(filePath).isFile()).toBe(true);
      });
    });
  });
});
