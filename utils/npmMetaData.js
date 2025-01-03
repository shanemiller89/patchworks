// npmMetadata.js - Handles fetching and validating metadata for packages.

import semver from 'semver' // Import semver for version validation
import logger from '../reports/logger.js'
import { execSync } from 'child_process'

/**
 * Fetch metadata for a given package using npm view.
 * @param {string} packageName - The name of the package.
 * @returns {object} - An object containing metadata fields.
 */
export async function fetchNpmMetadata(packageName) {
  try {
    const rawMetadata = execSync(`npm view ${packageName} --json`, {
      encoding: 'utf8',
    })
    const metadata = JSON.parse(rawMetadata)

    // Validate version field
    const version = semver.valid(metadata.version)
      ? metadata.version
      : 'UNKNOWN'
    if (version === 'UNKNOWN') {
      logger.warn(
        `Package ${packageName} has an invalid version: ${metadata.version}`,
      )
    }

    // Construct metadata with fallbacks for missing fields
    const repositoryUrl =
      metadata.repository?.url ||
      metadata.homepage ||
      metadata.bugs?.url ||
      'UNKNOWN'
    if (repositoryUrl === 'UNKNOWN') {
      logger.warn(`Package ${packageName} is missing a valid repository URL.`)
    }

    return {
      repositoryUrl,
      homepage: metadata.homepage || 'UNKNOWN',
      bugsUrl: metadata.bugs?.url || 'UNKNOWN',
      distTarball: metadata.dist?.tarball || 'UNKNOWN',
      version,
      contributors: metadata.contributors || 'UNKNOWN',
      license: metadata.license || 'UNKNOWN',
    }
  } catch (error) {
    logger.error(
      `Failed to fetch metadata for package: ${packageName}. Error: ${error.message}`,
    )
    return {
      repositoryUrl: 'UNKNOWN',
      homepage: 'UNKNOWN',
      bugsUrl: 'UNKNOWN',
      distTarball: 'UNKNOWN',
      version: 'UNKNOWN',
      contributors: 'UNKNOWN',
      license: 'UNKNOWN',
    }
  }
}

/**
 * Validate and parse repository metadata.
 * Supports GitHub primarily, with notes for unsupported GitLab and Bitbucket.
 * @param {string} repositoryUrl - The repository URL.
 * @param {object} metadata - The complete metadata object.
 * @returns {object} - Parsed repository details or fallback information.
 */
export function validateRepositoryMetadata(repositoryUrl, metadata) {
  if (!repositoryUrl || repositoryUrl === 'UNKNOWN') {
    return {
      owner: 'UNKNOWN',
      repo: 'UNKNOWN',
      fallback: metadata.homepage || metadata.bugsUrl || 'UNKNOWN',
    }
  }

  // GitHub repository matching (fully supported)
  const githubMatch = repositoryUrl.match(
    /github\.com[/:]([^/]+)\/([^/]+)(\.git)?/,
  )
  if (githubMatch) {
    return {
      owner: githubMatch[1],
      repo: githubMatch[2].replace('.git', ''),
      fallback: null,
    }
  }

  // GitLab repository matching (currently unsupported)
  const gitlabMatch = repositoryUrl.match(
    /gitlab\.com[/:]([^/]+)\/([^/]+)(\.git)?/,
  )
  if (gitlabMatch) {
    logger.warn(
      `Package repository appears to be hosted on GitLab: ${repositoryUrl}. Support for GitLab is currently not implemented.`,
    )
    return {
      owner: gitlabMatch[1],
      repo: gitlabMatch[2].replace('.git', ''),
      fallback: null,
    }
  }

  // Bitbucket repository matching (currently unsupported)
  const bitbucketMatch = repositoryUrl.match(
    /bitbucket\.org[/:]([^/]+)\/([^/]+)(\.git)?/,
  )
  if (bitbucketMatch) {
    logger.warn(
      `Package repository appears to be hosted on Bitbucket: ${repositoryUrl}. Support for Bitbucket is currently not implemented.`,
    )
    return {
      owner: bitbucketMatch[1],
      repo: bitbucketMatch[2].replace('.git', ''),
      fallback: null,
    }
  }

  // If no known repository pattern is matched
  return {
    owner: 'UNKNOWN',
    repo: 'UNKNOWN',
    fallback: metadata.homepage || metadata.bugsUrl || 'UNKNOWN',
  }
}

/**
 * Validate and log metadata for a given package.
 * @param {string} packageName - The name of the package.
 * @returns {object} - The validated metadata.
 */
export async function validateAndLogMetadata(packageName) {
  const metadata = await fetchNpmMetadata(packageName)
  const repositoryDetails = validateRepositoryMetadata(
    metadata.repositoryUrl,
    metadata,
  )

  if (
    repositoryDetails.owner === 'UNKNOWN' ||
    repositoryDetails.repo === 'UNKNOWN'
  ) {
    logger.warn(
      `Skipped Package: ${packageName}, Reason: Missing or invalid repository.`,
    )
  } else if (repositoryDetails.fallback) {
    logger.info(
      `Fallback URL used for Package: ${packageName}, Repository URL: ${repositoryDetails.fallback}`,
    )
  } else {
    logger.info(`Validated Metadata for Package: ${packageName}`)
    logger.debug(`Metadata: ${JSON.stringify(metadata, null, 2)}`)
  }

  return { ...metadata, repositoryDetails }
}
