#!/usr/bin/env node

import { fetchOutdatedDependenciesWithMetadata } from './utils/versionProcessor.js'
import { fetchReleaseNotes } from './utils/fetchReleaseNotes.js'
import { consoleSummaryReport } from './reports/consoleSummaryReport.js'
import { markdownUpdateReport } from './reports/markdownUpdateReport.js'
import { breakingChangesReport } from './reports/breakingChangesReport.js'
import logger from './reports/logger.js'
import { promptUserForDirectory } from './utils/prompts.js'
import { writeChanges, installDependencies } from './utils/updating-util.js'

import fs from 'fs'
import path from 'path'

const level = process.argv
  .find((arg) => arg.startsWith('--level='))
  ?.split('=')[1]
const isSummary = process.argv.includes('--summary')
const showSkippedFlag = process.argv.includes('--skipped')
const shouldWrite = process.argv.includes('--write')
const shouldInstall = process.argv.includes('--install')
const skipRepoless = process.argv.includes('--skip-repoless')

if (!level || !['patch', 'minor', 'major'].includes(level)) {
  logger.error(`Invalid or missing level flag: ${level}`)
  process.exit(1)
}

logger.info(`Running with update level: ${level}`)
logger.info(`Summary mode: ${isSummary ? 'Enabled' : 'Disabled'}`)
logger.info(
  `Show skipped packages: ${showSkippedFlag ? 'Enabled' : 'Disabled'}`,
)
logger.info(`Write changes: ${shouldWrite ? 'Enabled' : 'Disabled'}`)
logger.info(`Install updates: ${shouldInstall ? 'Enabled' : 'Disabled'}`)

async function main() {
  try {
    logger.heading('Version Tamer: Dependency Update Assistant')

    // Step 1: Prompt user for a custom directory
    const useCustomDir = await promptUserForDirectory()
    const reportDir = useCustomDir
      ? path.resolve('update_reports')
      : process.cwd()

    if (useCustomDir && !fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true })
      logger.info(`Created directory: ${reportDir}`)
    }
    logger.info('Reports will be saved in the current working directory.')

    // Step 2: Fetch outdated dependencies and validate metadata
    logger.info('Fetching outdated dependencies...')
    const { filteredPackages, skippedPackages } =
      await fetchOutdatedDependenciesWithMetadata(level, skipRepoless)

    if (Object.keys(filteredPackages).length === 0) {
      logger.success('All dependencies are up to date!')
      return
    }
    logger.info(
      `Processed ${Object.keys(filteredPackages).length} dependencies.`,
    )
    logger.info(`Skipped ${skippedPackages.length} dependencies.`)
    skippedPackages.forEach((pkg) => {
      logger.info(
        `- ${pkg.pkg}: ${pkg.reason} ${
          pkg.fallback ? `(Fallback URL: ${pkg.fallback})` : ''
        }`,
      )
    })

    // Step 3: Fetch release notes
    logger.info('Fetching release notes for dependencies...')
    for (const [pkg, info] of Object.entries(filteredPackages)) {
      if (info.repositoryUrl === 'UNKNOWN' && info.homepage) {
        logger.warn(`Using fallback homepage URL for ${pkg}: ${info.homepage}`)
      }

      const releaseNotes = await fetchReleaseNotes(
        info.repositoryUrl,
        info.current,
        info.version,
      )
      if (!releaseNotes) {
        logger.warn(`No release notes found for ${pkg}.`)
        continue // Include package but log the absence of release notes
      }
      filteredPackages[pkg].releaseNotes = releaseNotes
    }

    // Step 4: Generate reports
    logger.info('Generating reports...')
    consoleSummaryReport(
      filteredPackages,
      skippedPackages,
      showSkippedFlag,
      isSummary,
    )
    markdownUpdateReport(
      filteredPackages,
      path.join(reportDir, 'update-report.md'),
    )
    breakingChangesReport(
      [],
      path.join(reportDir, 'breaking-changes-report.md'),
    )

    // Step 5: Write changes (if enabled)
    if (shouldWrite) {
      logger.info('Writing changes to package.json...')
      writeChanges(filteredPackages)
    }

    // Step 6: Install dependencies (if enabled)
    if (shouldInstall) {
      logger.info('Installing updated dependencies...')
      installDependencies()
    }

    logger.success('Workflow completed successfully.')
  } catch (error) {
    logger.error(`An error occurred: ${error.message}`)
  }
}

main()
