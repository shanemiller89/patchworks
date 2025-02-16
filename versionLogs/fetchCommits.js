// versionLogs/fetchCommits.js

import { Octokit } from '@octokit/rest'
import { CommitParser } from 'conventional-commits-parser'
import semver from 'semver'
import logger from '../reports/logger.js'

/**
 * Fetches commits from a GitHub repository and generates a changelog.
 * This function is used as a fallback when no changelog or release notes are found.
 * It supports both `githubUrl` and `fallbackUrl` as the repository source.
 * @param {string} packageName - The name of the package.
 * @param {Object} metadata - Metadata containing GitHub repository URL or fallback URL and version information.
 * @returns {Promise<string|null>} A formatted changelog or null if no data is found.
 */
export async function fetchCommits({ packageName, metadata }) {
  const { current, latest, githubUrl, fallbackUrl } = metadata

  const repoUrl = githubUrl || fallbackUrl

  try {
    // Extract owner and repo from the URL using regex
    const match = repoUrl.match(/github\.com\/(.*?)\/(.*?)(\.git|$)/)
    if (!match) {
      logger.warn(`Invalid GitHub URL for ${packageName}: ${repoUrl}`)
      return null
    }

    const [, owner, repo] = match
    logger.info(`Fetching commits for ${owner}/${repo}`)

    const octokit = new Octokit()

    // Fetch tags
    logger.debug(`Fetching tags for ${owner}/${repo}`)
    const { data: tags } = await octokit.rest.repos.listTags({
      owner,
      repo,
    })

    if (!tags || tags.length === 0) {
      logger.warn(
        `No tags found for ${owner}/${repo}. Skipping commit fetching.`,
      )
      return null
    }

    logger.debug(`Available tags: ${tags.map((tag) => tag.name).join(', ')}`)

    const currentTag = tags.find(
      (tag) => semver.valid(tag.name) && semver.eq(tag.name, current),
    )
    const latestTag = tags.find(
      (tag) => semver.valid(tag.name) && semver.eq(tag.name, latest),
    )

    if (!currentTag || !latestTag) {
      logger.warn(
        `Tags for current (${current}) or latest (${latest}) not found. Skipping commit fetching.`,
      )
      return null
    }

    // Fetch commits between tags
    logger.debug(
      `Fetching commits between ${currentTag.name} and ${latestTag.name}`,
    )

    const { data: comparison } = await octokit.rest.repos.compareCommits({
      owner,
      repo,
      base: currentTag.name,
      head: latestTag.name,
    })

    if (!comparison.commits || comparison.commits.length === 0) {
      logger.info(
        `No commits found between ${currentTag.name} and ${latestTag.name}.`,
      )
      return null
    }

    logger.debug(`Number of commits found: ${comparison.commits.length}`)

    // Parse commits using `conventional-commits-parser`
    const parser = new CommitParser() // Initialize parser
    const conventionalCommits = []
    const nonConventionalCommits = []

    for (const commit of comparison.commits) {
      const parsed = parser.parse(commit.commit.message)
      if (parsed.type) {
        conventionalCommits.push({
          ...parsed,
          hash: commit.sha,
          url: commit.html_url,
        })
      } else {
        nonConventionalCommits.push(commit)
      }
    }

    let changelog = formatChangelog(conventionalCommits, nonConventionalCommits)

    // Fallback for non-conventional changelog when no conventional commits exist
    if (!changelog || conventionalCommits.length === 0) {
      changelog =
        `### Changelog\n\n` +
        comparison.commits
          .map((commit) => {
            const message = commit.commit.message.split('\n')[0] // Only the title of the commit
            const url = commit.html_url
            return `- ${message} ([${commit.sha.substring(0, 7)}](${url}))`
          })
          .join('\n')
    }

    return changelog || null
  } catch (error) {
    logger.error(`Error fetching commits for changelog: ${error.message}`)
    return null
  }
}

export function formatChangelog(conventionalCommits, nonConventionalCommits) {
  // Generate the conventional changelog
  const formattedChangelog = generateConventionalChangelog(conventionalCommits)

  // Handle non-conventional commits and append them
  if (nonConventionalCommits.length > 0) {
    const formattedNonConventional = nonConventionalCommits
      .map(({ commit, sha, html_url }) => {
        const message = commit?.message?.split('\n')[0] // Title only
        if (!message) {
          logger.warn(
            `Skipping malformed non-conventional commit: ${JSON.stringify(
              commit,
            )}`,
          )
          return null
        }
        return `- ${message} ([${sha.substring(0, 7)}](${html_url}))`
      })
      .filter(Boolean) // Remove null entries
      .join('\n')

    return `${
      formattedChangelog || '### Changelog\n\n'
    }\n\n### Additional Commits\n\n${formattedNonConventional}`
  }

  return formattedChangelog || '### Changelog\n\nNo changes available.'
}

function generateConventionalChangelog(commits) {
  if (!commits || commits.length === 0) {
    return null // Signal to fallback mechanism that no conventional changelog is available
  }

  const categories = {
    Features: [],
    Fixes: [],
    Documentation: [],
    Styles: [],
    Chores: [],
    Tests: [],
    Refactors: [],
    Breaking: [],
  }

  commits.forEach((commit) => {
    const { type, scope, subject, hash, url, header } = commit

    if (!type || !header) {
      logger.warn(`Skipping malformed commit: ${JSON.stringify(commit)}`)
      return // Skip malformed commits
    }

    const entry = `- **${type}${
      scope ? `(${scope})` : ''
    }:** ${subject} ([${hash.substring(0, 7)}](${url}))`

    switch (type) {
      case 'feat':
        categories.Features.push(entry)
        break
      case 'fix':
        categories.Fixes.push(entry)
        break
      case 'docs':
        categories.Documentation.push(entry)
        break
      case 'style':
        categories.Styles.push(entry)
        break
      case 'chore':
        categories.Chores.push(entry)
        break
      case 'test':
        categories.Tests.push(entry)
        break
      case 'refactor':
      case 'refac': // Handle shorthand for refactor
        categories.Refactors.push(entry)
        break
      default:
        logger.warn(`Unrecognized commit type: ${type}`)
        break
    }

    // Look for breaking changes in notes
    if (commit.notes?.length > 0) {
      categories.Breaking.push(entry)
    }
  })

  let changelog = `### Changelog\n\n`

  if (categories.Breaking.length > 0) {
    changelog += `#### Breaking Changes\n${categories.Breaking.join('\n')}\n\n`
  }
  if (categories.Features.length > 0) {
    changelog += `#### Features\n${categories.Features.join('\n')}\n\n`
  }
  if (categories.Fixes.length > 0) {
    changelog += `#### Bug Fixes\n${categories.Fixes.join('\n')}\n\n`
  }
  if (categories.Documentation.length > 0) {
    changelog += `#### Documentation\n${categories.Documentation.join(
      '\n',
    )}\n\n`
  }
  if (categories.Styles.length > 0) {
    changelog += `#### Styles\n${categories.Styles.join('\n')}\n\n`
  }
  if (categories.Chores.length > 0) {
    changelog += `#### Chores\n${categories.Chores.join('\n')}\n\n`
  }
  if (categories.Tests.length > 0) {
    changelog += `#### Tests\n${categories.Tests.join('\n')}\n\n`
  }
  if (categories.Refactors.length > 0) {
    changelog += `#### Refactors\n${categories.Refactors.join('\n')}\n\n`
  }

  return changelog.trim() || null // Return `null` if no categories are populated
}
