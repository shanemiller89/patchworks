// utils/versionProcessor.js

import _ from 'lodash'
import semver from 'semver'
import logger from '../reports/logger.js'
import { processPackagesMetadata } from './fetchMetadata.js'
// import { fetchNpmMetadata } from './npmMetaData.js' // Metadata already validated
import { exec } from 'child_process'

/**
 * Fetch outdated dependencies with validated metadata.
 * @param {string} level - Update level ('patch', 'minor', 'major').
 * @param {boolean} excludeRepoless - Exclude repository-less packages if true.
 * @param {string} levelScope - Scope of version filtering ('strict' or 'cascade').
 * @param {number} limit - Maximum number of updates to process.
 * @returns {Promise<Object>} Returns included and excluded packages.
 */
export async function processPackageVersions(
  level,
  excludeRepoless,
  levelScope = 'strict',
  limit = null,
) {
  const includedPackages = []
  const excludedPackages = []

  logger.debug(
    `Starting fetchOutdated with level: ${level}, scope: ${levelScope}`,
  )
  const outdated = await fetchOutdated(level, levelScope, excludedPackages)

  logger.debug(
    `Fetched and scoped outdated packages: ${JSON.stringify(
      outdated,
      null,
      2,
    )}`,
  )

  // Calculate updating difficulty prior to sorting
  Object.keys(outdated).forEach((pkg) => {
    outdated[pkg].updatingDifficulty = calculateUpdatingDifficulty(
      outdated[pkg].current,
      outdated[pkg].latest,
    )
  })

  // --Apply Limit Logic-- //
  const sortedPackages = _(outdated)
    .toPairs()
    .sortBy(([, value]) => value.updatingDifficulty)
    .fromPairs()
    .value()

  const packagesWithinLimit = {}

  if (limit) {
    logger.heading('LIMITING: Limiting packages by Jump Length')
  }

  for (const [pkg, info] of Object.entries(sortedPackages)) {
    if (limit && Object.keys(packagesWithinLimit).length >= limit) {
      logger.skipping({ limit, updateDifficulty: info.updatingDifficulty })
      logger.excluding(pkg, {
        reason: 'Limit Flag Enabled -  exceeded',
        metadata: {
          ...info,
        },
      })
      excludedPackages.push({
        pkg,
        reason: 'Limit exceeded',
        metadata: {
          ...info,
          validationStatus: 'UNVALIDATED METADATA',
        },
      })
      continue
    }

    if (limit) {
      logger.evaluating({ limit, updateDifficulty: info.updatingDifficulty })
    }

    packagesWithinLimit[pkg] = info
  }

  // --Validate Metadata for Remaining Packages-- //
  logger.heading('Validating: Ensuring Metadata Integrity.')

  const { valid, invalid } = await processPackagesMetadata(packagesWithinLimit)

  logger.info(
    `${Object.keys(valid).length} passed Metadata retrieval and validation`,
  )

  for (const [pkg, metadata] of Object.entries(valid)) {
    if (excludeRepoless && (!metadata.githubrl || !metadata.fallbackUrl)) {
      logger.info(
        '--exclude-reploess is set, Packages that do not have a github repo will be excluded.',
      )
      logger.excluding(pkg, {
        reason: 'Missing repository information',
        metadata,
      })
      excludedPackages.push({
        packageName: pkg,
        reason: 'Missing repository information',
        metadata,
      })
      continue
    }

    if (!metadata.githubrl && metadata.fallbackUrl) {
      logger.fallback('Using fallback URL')
    }

    includedPackages.push({
      packageName: pkg,
      metadata,
    })
  }

  for (const [pkg, metadata] of Object.entries(invalid)) {
    logger.excluding(pkg, {
      reason: 'Limit Flag Enabled -  exceeded',
      metadata,
    })
    excludedPackages.push({
      packageName: pkg,
      reason: 'FAILED VALIDATION',
      metadata,
    })
    continue
  }

  // Final logging
  logger.success(
    `[Including]: ${Object.keys(includedPackages).length} packages.`,
  )
  logger.warn(`[Excluding] ${excludedPackages.length} packages.`)

  logger.debug(`Included: ${JSON.stringify(includedPackages, null, 2)}`)
  // logger.debug(`Excluded: ${JSON.stringify(excludedPackages, null, 2)}`)

  return { includedPackages, excludedPackages }
}

/**
 * Executes `npm outdated` to retrieve and filter outdated dependencies.
 * @param {string} level - Update level ('patch', 'minor', 'major').
 * @param {string} levelScope - Scope of version filtering ('strict' or 'cascade').
 * @returns {Promise<Object>} A JSON object of filtered outdated dependencies.
 */
function fetchOutdated(level, levelScope, excludedPackages) {
  return new Promise((resolve, reject) => {
    logger.debug(
      `Executing npm outdated with level: ${level}, scope: ${levelScope}`,
    )
    exec(
      'npm outdated --json',
      { maxBuffer: 10 * 1024 * 1024 },
      (err, stdout) => {
        if (err && !stdout.trim()) {
          reject(err)
          return
        }
        const outdated = stdout.trim() ? JSON.parse(stdout) : {}
        const filtered = {}

        // Order outdated packages by update level
        const orderedOutdated = Object.entries(outdated).sort(
          ([, a], [, b]) => {
            const updateTypeOrder = {
              patch: 1,
              minor: 2,
              major: 3,
              preRelease: 4,
              unknown: 5,
            }
            const aType = categorizeVersionJump(a.current, a.latest)
            const bType = categorizeVersionJump(b.current, b.latest)
            return (updateTypeOrder[aType] || 6) - (updateTypeOrder[bType] || 6)
          },
        )

        logger.info(
          `${
            Object.entries(outdated).length
          } total outdated packages detected.`,
        )
        logger.separator('\n\n')

        for (const [pkg, info] of orderedOutdated) {
          const updateType = categorizeVersionJump(info.current, info.latest)
          if (updateType === 'unknown') {
            logger.logReviewState(pkg, 'skipping', {
              reason: 'Non-semantic version format',
              current: info.current,
              latest: info.latest,
              levelScope,
              updateType: 'UNKNOWN',
            })
            logger.excluding(pkg, {
              reason: `Release is ${info.latest} - UNKNOWN VERSION.`,
              metadata: {
                updatingDifficulty: 'UNKNOWN',
                current: info.current,
                latest: info.latest,
              },
            })
            excludedPackages.push({
              packageName: pkg,
              reason: `Release is ${info.latest} - UNKNOWN VERSION.`,
              metadata: {
                updatingDifficulty: 'UNKNOWN',
                current: info.current,
                latest: info.latest,
              },
            })
            continue
          }

          if (updateType === 'pre-release') {
            logger.logReviewState(pkg, 'skipping', {
              reason: 'Pre-release status identified',
              current: info.current,
              latest: info.latest,
              levelScope,
              updateType,
            })
            logger.excluding(pkg, {
              reason: `Release is ${info.latest} - Pre-releases are currently not handled.`,
              metadata: {
                updatingDifficulty: 'UNKNOWN',
                current: info.current,
                latest: info.latest,
              },
            })
            excludedPackages.push({
              packageName: pkg,
              reason: `Release is ${info.latest} - Pre-releases are currently not handled.`,
              metadata: {
                updatingDifficulty: 'UNKNOWN',
                current: info.current,
                latest: info.latest,
              },
            })
            continue
          }

          const levelIndex = ['patch', 'minor', 'major'].indexOf(level)
          const updateIndex = ['patch', 'minor', 'major'].indexOf(updateType)

          if (
            (levelScope === 'strict' && updateType !== level) ||
            (levelScope === 'cascade' && updateIndex > levelIndex)
          ) {
            logger.logReviewState(pkg, 'skipping', {
              reason: `SEMANTIC LEVEL SCOPE DOES NOT MATCH [[Level: ${level}]] [[Scope: ${levelScope}]]`,
              current: info.current,
              latest: info.latest,
              levelScope,
              updateType,
            })
            logger.excluding(pkg, {
              reason: `Level/Scope Mismatch`,
              metadata: {
                updatingDifficulty: 'UNKNOWN',
                current: info.current,
                latest: info.latest,
              },
            })
            excludedPackages.push({
              packageName: pkg,
              reason: `Level/Scope Mismatch`,
              metadata: {
                updatingDifficulty: 'UNKNOWN',
                ...info,
              },
            })
            continue
          }

          logger.logReviewState(pkg, 'evaluating', {
            reason: 'SEMANTIC LEVEL SCOPE MATCH',
            current: info.current,
            latest: info.latest,
            levelScope,
            updateType,
          })
          filtered[pkg] = { ...info, updateType }
        }

        resolve(filtered)
      },
    )
  })
}

/**
 * Categorizes the version jump type between current and latest versions.
 * @param {string} current - The current version of the package.
 * @param {string} latest - The latest version of the package.
 * @returns {string} The type of version jump ('patch', 'minor', 'major', 'unknown', 'pre-release').
 */
export function categorizeVersionJump(current, latest) {
  logger.debug(
    `Categorizing version jump: Current=${current}, Latest=${latest}`,
  )
  if (!semver.valid(current) || !semver.valid(latest)) {
    logger.debug('Categorization result: unknown')
    return 'unknown'
  }
  if (semver.prerelease(latest)) {
    logger.debug('Categorization result: pre-release')
    return 'pre-release'
  }
  const diff = semver.diff(current, latest) || 'unknown'
  logger.debug(`Categorization result: ${diff}`)
  return diff
}

/**
 * Calculate the difficulty of updating a package based on version gap.
 * @param {string} currentVersion - The current version of the package.
 * @param {string} latestVersion - The latest version of the package.
//  * @param {boolean} levelScope - Whether to factor semantic level.
 * @returns {number} - The updating difficulty (lower is easier).
 */
function calculateUpdatingDifficulty(currentVersion, latestVersion) {
  const currentParts = semver.parse(currentVersion)
  const latestParts = semver.parse(latestVersion)

  if (!currentParts || !latestParts) return Infinity // Handle invalid versions

  const majorJump = Math.abs(latestParts.major - currentParts.major)
  const minorJump = Math.abs(latestParts.minor - currentParts.minor)
  const patchJump = Math.abs(latestParts.patch - currentParts.patch)

  return majorJump * 100 + minorJump * 10 + patchJump
}

// function calculateUpdatingDifficulty(
//   currentVersion,
//   latestVersion,
//   levelScope,
// ) {
//   const levelWeights = { patch: 1, minor: 10, major: 100 }
//   const jumpType = semver.diff(currentVersion, latestVersion)

//   if (!jumpType) return Infinity // Handle invalid or undefined jumps

//   // Apply level weight for cascade mode
//   const levelWeight =
//     levelScope === 'cascade' ? levelWeights[jumpType] || 1000 : 0

//   // Parse versions to extract semantic components
//   const currentParts = semver.parse(currentVersion)
//   const latestParts = semver.parse(latestVersion)

//   // Calculate intra-level differences
//   const majorJump = Math.abs(
//     (latestParts.major || 0) - (currentParts.major || 0),
//   )
//   const minorJump = Math.abs(
//     (latestParts.minor || 0) - (currentParts.minor || 0),
//   )
//   const patchJump = Math.abs(
//     (latestParts.patch || 0) - (currentParts.patch || 0),
//   )

//   // Granular scoring: Combine weighted differences
//   const totalScore =
//     majorJump * levelWeights.major +
//     minorJump * levelWeights.minor +
//     patchJump * levelWeights.patch +
//     levelWeight

//   return totalScore
// }
