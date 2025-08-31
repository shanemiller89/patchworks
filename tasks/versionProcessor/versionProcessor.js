// tasks/versionProcessor/versionProcessor.js

import _ from 'lodash'
import semver from 'semver'
import { askToContinue } from '../../prompts/prompts.js'
import {
  displayExcludedPackages,
  displayIncludedPackages,
} from '../../reports/consoleTaskReports.js'
import logger from '../../reports/logger.js'
import { styles } from '../../reports/styles.js'
import { UNKNOWN } from '../../utils/constants.js'
import { processPackagesMetadata } from './fetchMetadata.js'
import { exec } from 'child_process'

/**
 * Processes package versions by fetching outdated packages, calculating update difficulty,
 * and processing each package to determine inclusion or exclusion based on metadata validation.
 * @param {Object} task - The Listr task object for managing subtasks.
 * @param {Object} options - Options for processing package versions.
 * @param {string} options.level - Update level ('patch', 'minor', 'major').
 * @param {string} options.levelScope - Scope of version filtering ('strict' or 'cascade').
 * @param {number} options.limit - Maximum number of updates to process.
 * @param {boolean} options.excludeRepoless - Exclude repository-less packages if true.
 * @returns {Promise<Object>} Returns included and excluded packages.
 */
export async function processPackageVersions(task, options) {
  return task.newListr([
    {
      title: 'Fetch outdated packages',
      task: async (ctx, localTask) => {
        ctx.options = options
        const { level, levelScope } = options
        ctx.includedPackages = []
        ctx.excludedPackages = []
        ctx.packagesWithinLimit = {}

        localTask.title = `Fetching outdated packages with level: ${styles[
          level
        ](level)}, scope: ${levelScope}`

        const result = await fetchOutdated(localTask, options)
        ctx.outdated = result.outdated
        ctx.excludedPackages = [...result.excludedPackages]

        logger.debug(
          `Fetched and scoped outdated packages: ${JSON.stringify(
            ctx.outdated,
            null,
            2,
          )}`,
        )

        localTask.title = `Fetched and scoped outdated packages: ${
          Object.keys(ctx.outdated).length
        } packages.`

        if (!ctx.outdated) {
          throw new Error('Failed to fetch outdated packages.')
        }
      },
    },
    {
      title: 'Calculate updating difficulty',
      task: async (ctx) => {
        Object.keys(ctx.outdated).forEach((pkg) => {
          ctx.outdated[pkg].updatingDifficulty = calculateUpdatingDifficulty(
            ctx.outdated[pkg].current,
            ctx.outdated[pkg].latest,
          )
          logger.debug(`Calculated difficulty for package: ${pkg}`)
        })

        // Sort packages by updating difficulty
        ctx.packages = _(ctx.outdated)
          .toPairs()
          .sortBy(([, value]) => value.updatingDifficulty)
          .fromPairs()
          .value()
      },
    },
    {
      title: 'Check Package Limits',
      task: (ctx, task) => {
        return task.newListr(
          Object.entries(ctx.packages).map(([pkg, info]) => ({
            title: `Checking limit for ${pkg}`,
            skip: (ctx) => {
              if (
                ctx.options.limit &&
                Object.keys(ctx.packagesWithinLimit).length >= ctx.options.limit
              ) {
                ctx.excludedPackages.push({
                  packageName: pkg,
                  reason: 'Limit exceeded',
                  metadata: {
                    validationStatus: 'SKIPPED',
                    ...info,
                  },
                })
                return true
              }
              return false
            },
            task: () => {
              ctx.packagesWithinLimit[pkg] = {
                ...info,
              }
            },
          })),
        )
      },
    },
    {
      title: 'Validate Metadata for Remaining Packages',
      task: async (ctx, task) => {
        ctx.packages = ctx.packagesWithinLimit

        task.title = `Validating ${Object.keys(ctx.packages).length} packages`

        logger.debug(
          `Validating packages: ${JSON.stringify(ctx.packages, null, 2)}`,
        )

        // --Validate Metadata for Remaining Packages-- //

        const { valid, invalid } = await processPackagesMetadata(ctx.packages)

        task.title = `Validated ${Object.keys(valid).length} packages`

        ctx.valid = valid
        ctx.invalid = invalid
      },
    },
    {
      title: 'Processing Valid Packages',
      task: async (ctx, task) => {
        task.title = `Processing ${Object.keys(ctx.valid).length} packages`
        logger.info(
          `${
            Object.keys(ctx.valid).length
          } passed Metadata retrieval and validation`,
        )

        return task.newListr(
          Object.entries(ctx.valid).map(([pkg, info]) => ({
            title: `Checking limit for ${pkg}`,
            skip: (ctx) => {
              if (
                ctx.options.excludeRepoless &&
                (!info.githubUrl || !info.fallbackUrl)
              ) {
                ctx.excludedPackages.push({
                  packageName: pkg,
                  reason: 'Missing repository information',
                  metadata: info,
                })
                return true
              }
              return false
            },
            task: () => {
              ctx.includedPackages.push({
                packageName: pkg,
                metadata: info,
              })
            },
          })),
        )
      },
    },

    //     for (const [pkg, metadata] of Object.entries(ctx.invalid)) {
    //       logger.excluding(pkg, {
    //         reason: 'Limit Flag Enabled -  exceeded',
    //         metadata,
    //       })
    //       ctx.excludedPackages.push({
    //         packageName: pkg,
    //         reason: 'FAILED VALIDATION',
    //         metadata,
    //       })
    //       continue
    //     }

    //     // Final logging
    //     logger.success(`[Including]: ${ctx.includedPackages.length} packages.`)
    //     logger.warn(`[Excluding] ${ctx.excludedPackages.length} packages.`)

    //     logger.debug(
    //       `Included: ${JSON.stringify(ctx.includedPackages, null, 2)}`,
    //     )
    //   },
    // },
    {
      title: 'Generate Report',
      task: async (ctx, task) => {
        // Display included packages table
        const includedTable = await displayIncludedPackages(
          ctx.includedPackages,
        )

        // Conditionally display excluded packages table
        let excludedTable = ''
        if (ctx.options.showExcluded) {
          excludedTable = await displayExcludedPackages(ctx.excludedPackages)
        }

        // Set the task output
        task.output = `Included Packages:\n${includedTable}\n${
          ctx.options.showExcluded ? `Excluded Packages:\n${excludedTable}` : ''
        }`

        // Ask to proceed
        const shouldContinue = await askToContinue(
          task,
          'Proceed to fetch release notes and changelogs?',
        )
        if (!shouldContinue) {
          throw new Error('Operation cancelled by the user.')
        } else {
          return {
            includedPackages: ctx.includedPackages,
            excludedPackages: ctx.excludedPackages,
          }
        }
      },
      rendererOptions: { bottomBar: 999 },
    },
  ])
}

/**
 * Executes `npm outdated` to retrieve and filter outdated dependencies.
 * @param {Object} task - Listr task object for updating output
 * @param {Object} options - Options object containing:
 * @param {string} options.level - Update level ('patch', 'minor', 'major')
 * @param {string} options.levelScope - Scope of version filtering ('strict' or 'cascade')
 * @param {Array} options.excludedPackages - Array to store excluded packages
 * @returns {Promise<Object>} A JSON object of filtered outdated dependencies
 */
function fetchOutdated(task, options) {
  const excludedPackages = []
  const { level, levelScope } = options
  return new Promise((resolve, reject) => {
    task.title = `Executing npm outdated with level: ${styles[level](
      level,
    )}, scope: ${levelScope}`

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
              'pre-release': 4,
              unknown: 5,
            }
            const aType = categorizeVersionJump(a.current, a.latest)
            const bType = categorizeVersionJump(b.current, b.latest)
            return (updateTypeOrder[aType] || 6) - (updateTypeOrder[bType] || 6)
          },
        )

        task.output = logger.info(
          `${
            _.isEmpty(outdated) ? 0 : Object.entries(outdated).length
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
                updatingDifficulty: UNKNOWN,
                validationStatus: 'SKIPPED',
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
              updateType: 'PRE-RELEASE',
            })
            logger.excluding(pkg, {
              reason: `Release is ${info.latest} - Pre-releases are currently not handled.`,
              metadata: {
                updatingDifficulty: UNKNOWN,
                current: info.current,
                latest: info.latest,
              },
            })
            excludedPackages.push({
              packageName: pkg,
              reason: `Release is ${info.latest} - Pre-releases are currently not handled.`,
              metadata: {
                updatingDifficulty: UNKNOWN,
                current: info.current,
                latest: info.latest,
                validationStatus: 'SKIPPED',
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
                updateType,
                validationStatus: 'SKIPPED',
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

        resolve({ outdated: filtered, excludedPackages })
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
