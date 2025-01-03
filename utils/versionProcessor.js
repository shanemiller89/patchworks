// utils/versionProcessor.js

import semver from 'semver'
import logger from '../reports/logger.js'
import { fetchNpmMetadata } from './npmMetaData.js'
import { exec } from 'child_process'

/**
 * Fetch outdated dependencies with npm metadata validation and filtering.
 * @param {string} level - Update level ('patch', 'minor', 'major').
 * @param {boolean} skipRepoless - Skip repository-less packages if true.
 * @returns {Promise<Object>} Filtered dependencies and skipped packages.
 */
export async function fetchOutdatedDependenciesWithMetadata(
  level,
  skipRepoless,
) {
  const outdated = await fetchOutdatedDependencies()

  const filteredPackages = {}
  const skippedPackages = []

  for (const [pkg, info] of Object.entries(outdated)) {
    // Fetch and validate metadata
    const metadata = await fetchNpmMetadata(pkg)
    const repoDetails = metadata.repositoryDetails

    // Log fallback URLs if used
    if (repoDetails.fallback) {
      logger.info(
        `Using fallback repository URL for ${pkg}: ${repoDetails.fallback}`,
      )
    }

    // Skip repository-less packages if `skipRepoless` is enabled
    if (
      skipRepoless &&
      repoDetails.owner === 'UNKNOWN' &&
      repoDetails.repo === 'UNKNOWN'
    ) {
      logger.excluding(pkg, 'Repository URL is missing')
      skippedPackages.push({ pkg, reason: 'Repository URL is missing' })
      continue
    }

    // Skip packages with invalid repositories
    if (repoDetails.owner === 'UNKNOWN' || repoDetails.repo === 'UNKNOWN') {
      logger.excluding(pkg, 'Invalid repository metadata')
      skippedPackages.push({ pkg, reason: 'Invalid repository metadata' })
      continue
    }

    // Determine version jump type
    const updateType = categorizeVersionJump(info.current, info.latest)
    if (updateType === 'unknown') {
      logger.excluding(pkg, 'Invalid or non-semantic version format')
      skippedPackages.push({
        pkg,
        reason: 'Invalid or non-semantic version format',
      })
      continue
    }

    // Skip packages that don't match the desired update level
    if (updateType !== level) {
      logger.excluding(pkg, `Does not match level ${level}`)
      skippedPackages.push({ pkg, reason: `Does not match level ${level}` })
      continue
    }

    // Include validated package with metadata and version details
    filteredPackages[pkg] = { ...metadata, ...info, updateType }
  }

  logger.info(`Filtered ${Object.keys(filteredPackages).length} packages.`)
  logger.info(`Skipped ${skippedPackages.length} packages.`)
  return { filteredPackages, skippedPackages }
}

/**
 * Categorizes the version jump type between the current and latest version.
 * @param {string} current - The current version of the package.
 * @param {string} latest - The latest version of the package.
 * @returns {string} The type of version jump ('patch', 'minor', 'major', 'unknown').
 */
export function categorizeVersionJump(current, latest) {
  if (!semver.valid(current) || !semver.valid(latest)) {
    return 'unknown'
  }
  return semver.diff(current, latest) || 'unknown'
}

/**
 * Executes `npm outdated` to retrieve outdated dependencies.
 * @returns {Promise<Object>} A JSON object of outdated dependencies.
 */
function fetchOutdatedDependencies() {
  return new Promise((resolve, reject) => {
    exec(
      'npm outdated --json',
      { maxBuffer: 10 * 1024 * 1024 },
      (err, stdout) => {
        if (err && !stdout.trim()) {
          reject(err)
          return
        }
        resolve(stdout.trim() ? JSON.parse(stdout) : {})
      },
    )
  })
}
