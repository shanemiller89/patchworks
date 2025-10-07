describe('Import Verification Tests', () => {
  const fs = require('fs');
  const path = require('path');

  const keyModules = [
    { name: 'Config Utility', path: '../../config/configUtil.js' },
    { name: 'Constants', path: '../../utils/constants.js' },
    { name: 'Alignment Helpers', path: '../../utils/alignmentHelpers.js' },
    { name: 'Analysis - Categorize Logs', path: '../../analysis/categorizeLogs.js' },
    { name: 'Analysis - Compute TFIDF', path: '../../analysis/computeTFIDFRanking.js' },
    { name: 'Prompts - Base Toggle', path: '../../prompts/baseToggle.js' },
    { name: 'Version Logs - Fetch Changelog', path: '../../versionLogs/fetchChangelog.js' }
  ];

  const resolveWithFallback = (modulePath) => {
    const resolvedPath = path.resolve(__dirname, modulePath);

    if (fs.existsSync(resolvedPath)) {
      return resolvedPath;
    }

    if (modulePath.endsWith('.js')) {
      const tsPath = resolvedPath.replace(/\.js$/, '.ts');
      if (fs.existsSync(tsPath)) {
        return tsPath;
      }
    }

    return resolvedPath;
  };

  describe('File existence validation', () => {
    keyModules.forEach(({ name, path: modulePath }) => {
      test(`${name} file should exist`, () => {
        const resolvedPath = resolveWithFallback(modulePath);
        expect(fs.existsSync(resolvedPath)).toBe(true);
      });
    });
  });

  describe('Entry point validation', () => {
    test('package.json main entry point exists', () => {
      const packageJsonPath = path.resolve(__dirname, '../../package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      const mainPath = path.resolve(__dirname, '../../', packageJson.main);
      expect(fs.existsSync(mainPath)).toBe(true);
    });

    test('binary entry point exists and is executable', () => {
      const packageJsonPath = path.resolve(__dirname, '../../package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      const binPath = path.resolve(__dirname, '../../', packageJson.bin.patchworks);
      expect(fs.existsSync(binPath)).toBe(true);
      
      const stats = fs.statSync(binPath);
      expect(stats.mode & parseInt('111', 8)).toBeGreaterThan(0);
    });
  });

  describe('Directory structure validation', () => {
    const requiredDirectories = [
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
    const criticalFiles = [
      'package.json',
      'LICENSE',
      'README.md',
      '.npmignore',
      'jest.config.js'
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