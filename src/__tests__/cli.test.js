describe('CLI module structure', () => {
  test('CLI module exists and has correct structure', () => {
    // Test that the CLI module can be required
    expect(() => {
      const path = require('path');
      const fs = require('fs');
      const candidates = [
        path.join(__dirname, '../cli/index.js'),
        path.join(__dirname, '../cli/index.ts'),
      ];
      const cliPath = candidates.find(candidate => fs.existsSync(candidate));
      expect(cliPath).toBeDefined();
    }).not.toThrow();
  });

  test('binary file exists and is executable', () => {
    const path = require('path');
    const fs = require('fs');
    const candidates = [
      path.join(__dirname, '../../bin/patchworks.js'),
      path.join(__dirname, '../../bin/patchworks.ts'),
    ];
    const binPath = candidates.find(candidate => fs.existsSync(candidate));

    expect(binPath).toBeDefined();

    const stats = fs.statSync(binPath);
    expect(stats.isFile()).toBe(true);
    // Check if file has execute permissions
    expect(stats.mode & parseInt('111', 8)).toBeGreaterThan(0);
  });

  test('package.json has correct configuration', () => {
    const path = require('path');
    const fs = require('fs');
    const packagePath = path.join(__dirname, '../../package.json');
    
    expect(fs.existsSync(packagePath)).toBe(true);
    
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    expect(packageJson.name).toBe('patchworks');
    expect(packageJson.bin).toBeDefined();
    expect(['./bin/patchworks.js', './bin/patchworks.ts']).toContain(packageJson.bin.patchworks);
    expect(['src/cli/index.js', 'src/cli/index.ts']).toContain(packageJson.main);
  });
});
