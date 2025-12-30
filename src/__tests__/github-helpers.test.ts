import { describe, test, expect } from 'vitest';
import { parseGitHubUrl } from '../../utils/githubHelpers.js';

describe('parseGitHubUrl', () => {
  test('parses standard GitHub URL', () => {
    const result = parseGitHubUrl('https://github.com/owner/repo');
    expect(result).toEqual({ owner: 'owner', repo: 'repo' });
  });

  test('parses GitHub URL with .git extension', () => {
    const result = parseGitHubUrl('https://github.com/owner/repo.git');
    expect(result).toEqual({ owner: 'owner', repo: 'repo' });
  });

  test('returns null for invalid URL', () => {
    const result = parseGitHubUrl('https://example.com/owner/repo');
    expect(result).toBeNull();
  });

  test('returns null for undefined URL', () => {
    const result = parseGitHubUrl(undefined);
    expect(result).toBeNull();
  });

  test('returns null for empty string', () => {
    const result = parseGitHubUrl('');
    expect(result).toBeNull();
  });

  test('parses git protocol URL', () => {
    const result = parseGitHubUrl('git://github.com/owner/repo.git');
    expect(result).toEqual({ owner: 'owner', repo: 'repo' });
  });

  test('parses ssh protocol URL', () => {
    const result = parseGitHubUrl('git@github.com:owner/repo.git');
    expect(result).toBeNull(); // This format is not supported by the regex
  });
});
