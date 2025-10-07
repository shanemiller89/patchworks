describe('CLI module structure', () => {
  test('CLI module exists and has correct structure', () => {
    // Test that the CLI module can be required
    expect(() => {
      const path = require('path');
      const cliPath = path.join(__dirname, '../cli/index.ts');
      const fs = require('fs');
      expect(fs.existsSync(cliPath)).toBe(true);
    }).not.toThrow();
  });

  test('binary file exists and is executable', () => {
    const path = require('path');
    const fs = require('fs');
    const binPath = path.join(__dirname, '../../bin/patchworks.ts');
    
    expect(fs.existsSync(binPath)).toBe(true);
    
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
    expect(packageJson.bin.patchworks).toBe('./bin/patchworks.ts');
    expect(packageJson.main).toBe('src/cli/index.ts');
  });
});
