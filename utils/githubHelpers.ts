/**
 * Parses a GitHub repository URL to extract owner and repo name
 * @param url - GitHub repository URL (e.g., https://github.com/owner/repo or https://github.com/owner/repo.git)
 * @returns An object containing owner and repo, or null if URL is invalid
 */
export function parseGitHubUrl(url: string | undefined): { owner: string; repo: string } | null {
  if (!url) {
    return null;
  }

  const match = url.match(/github\.com\/(.*?)\/(.*?)(\.git|$)/);
  if (!match) {
    return null;
  }

  const [, owner, repo] = match;
  return { owner, repo };
}
