#!/usr/bin/env node

// import { consoleSummaryReport } from './reports/consoleSummaryReport.js'
// import { markdownUpdateReport } from './reports/markdownUpdateReport.js'
// import { breakingChangesReport } from './reports/breakingChangesReport.js'
import { Command } from 'commander'
import _ from 'lodash'
import { parseIncludedPackage } from './analyzing/analyzeLogData.js'
import { fetchChangelog } from './releaseLogs/fetchChangelog.js'
import { fetchCommits } from './releaseLogs/fetchCommits.js'
import { fetchReleaseNotes } from './releaseLogs/fetchReleaseNotes.js'
import logger from './reports/logger.js'
import { MAIN_TITLE } from './utils/constants.js'
import { promptUserForDirectory } from './utils/prompts.js'
import { installDependencies, writeChanges } from './utils/updating-util.js'
import { processPackageVersions } from './utils/versionProcessor.js'
import fs from 'fs'
import path from 'path'
// import { generateReports } from './reports/generateReports.js'

const program = new Command()

// Define CLI options
program
  .name('patchworks')
  .description(
    'Patchworks CLI: A utility for managing dependency updates efficiently.',
  )
  .usage('--level <level> [--limit <number>] [--level-scope <scope>] [options]')
  .requiredOption(
    '-l, --level <level>',
    'Specify the update level (patch, minor, major)',
  )
  .option(
    '-n, --limit <number>',
    'Limit the number of updates processed',
    (value) => {
      const parsedValue = parseInt(value, 10)
      if (isNaN(parsedValue) || parsedValue <= 0) {
        throw new Error('The --limit flag must be a positive integer.')
      }
      return parsedValue
    },
  )
  .option(
    '--level-scope <scope>',
    'Control semantic version filtering (strict or cascade)',
    (value) => {
      if (!['strict', 'cascade'].includes(value)) {
        throw new Error("The --level-scope flag must be 'strict' or 'cascade'.")
      }
      return value
    },
    'strict',
  )
  .option('-s, --summary', 'Generate a summary report')
  .option('-k, --skipped', 'Show skipped packages in the output')
  .option('-w, --write', 'Write changes to a file or make them persistent')
  .option('-i, --install', 'Install dependencies after processing')
  .option('--exclude-repoless', 'Exclude packages without repositories')
  .option('-d, --debug', 'Show verbose debug consoles')
  .addHelpText(
    'before',
    `
${MAIN_TITLE}
  A utility for managing dependency updates efficiently.

  Example Usage:
    $ patchworks --level=minor --limit=5

  Required:
    --level <level>  Specify the update level (patch, minor, major).

  Optional:
    --limit <number>        Limit the number of updates processed (default: no limit).
    --level-scope <scope>   Control semantic version filtering (strict or cascade).
    --summary               Generate a summary report.
    --skipped               Show skipped packages in the output.
    --write                 Persist changes to package.json.
    --install               Install updated dependencies.
    --exclude-repoless         Skip packages without repository links.
  `,
  )
  .addHelpText(
    'after',
    `
  ==============================================
  For more information, visit:
  https://github.com/shanemiller89/patchworks
  ==============================================
  `,
  )

// Configure custom output for errors
program.configureOutput({
  outputError: (str, write) => {
    write('')
    logger.error(str.trim()) // Use logger for errors
    program.help() // Show help menu
  },
})

// Parse CLI arguments
program.parse(process.argv)

const options = program.opts()

if (options.debug) {
  process.env.DEBUG = 'true' // Set DEBUG for the logger
  logger.warn(`ಥ﹏ಥ -- RUNNING IN DEBUG MODE -- (╥﹏╥)`)
}

logger.patchworks(' ')
// Log input
logger.separator('\n')
logger.info(`Running with update level: ${options.level}`)
logger.info(`Update limit: ${options.limit || 'none'}`)
logger.info(`Level scope: ${options.levelScope || 'strict'}`)
logger.info(`Summary mode: ${options.summary ? 'Enabled' : 'Disabled'}`)
logger.info(
  `Show excluded packages: ${options.excluded ? 'Enabled' : 'Disabled'}`,
)
logger.info(`Write changes: ${options.write ? 'Enabled' : 'Disabled'}`)
logger.info(`Install updates: ${options.install ? 'Enabled' : 'Disabled'}`)
logger.separator('')

async function main() {
  const { level, levelScope } = options

  try {
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
    logger.separator()

    // Step 2: Fetch outdated dependencies and validate metadata
    logger.heading('Initiating: Evaluating outdated packages.')

    logger.info(`Version Level: [[${level}]] / Level Scope: [[${levelScope}]]`)

    const { includedPackages, excludedPackages } = await processPackageVersions(
      options.level,
      options.excludeRepoless,
      options.levelScope,
      options.limit,
    )

    if (_.isEmpty(Object.keys(includedPackages))) {
      if (_.isEmpty(Object.keys(excludedPackages))) {
        logger.success('All dependencies are up to date! No updates needed.')
      } else {
        logger.warn(
          'Based on current scope,dependencies require update were excluded, and no packages are eligible for update. Expand your scope or manually update. Check generated report for details',
        )
      }
    }

    logger.success('Outdated Packages Evaluated: Packages found for updating. ')

    // Step 3: Release Notes/Changelog Attempts
    logger.heading('Fetching: Checking for release notes for valid packages.')

    for (const [index, pkg] of includedPackages.entries()) {
      const { metadata, packageName } = pkg

      logger.debug(`${packageName} - STARTING RELEASE NOTE CHECK PROCESS`)

      let releaseNotes = null
      let changelog = null

      if (metadata.releaseNotesCompatible) {
        releaseNotes = await fetchReleaseNotes({ packageName, metadata })
        logger.debug(
          `Release Notes for ${packageName}: ${JSON.stringify(releaseNotes)}`,
        )
        includedPackages[index].releaseNotes = releaseNotes
        includedPackages[index].changelog = null
      }

      if (_.isEmpty(releaseNotes) && metadata.fallbackACompatible) {
        logger.fallback(
          `Attempting changelog fallback for ${packageName}. No Release Notes: ${_.isEmpty(
            releaseNotes,
          )}`,
          JSON.stringify(metadata.dist.tarball),
        )
        changelog = await fetchChangelog({ packageName, metadata })
        includedPackages[index].releaseNotes = null
        includedPackages[index].changelog = changelog
      }

      if (!releaseNotes && !changelog && metadata.fallbackBCompatible) {
        logger.fallback(
          `Attempting commit based changelog fallback for ${packageName}`,
          metadata.githubUrl || metadata.fallbackUrl,
        )
        changelog = await fetchCommits({ packageName, metadata })
        logger.success(
          `Changelog from commits created for ${packageName} - ${changelog}`,
        )
        includedPackages[index].releaseNotes = null
        includedPackages[index].changelog = changelog
      }

      if (!releaseNotes && !changelog) {
        includedPackages[index].releaseNotes = null
        includedPackages[index].changelog = null
      }
    }

    logger.success('Note retrieval complete')

    // Step 4: Parse data
    logger.heading('Analyzing: Parsing and Categorizing retreived logs.')

    for (const [index, pkg] of includedPackages.entries()) {
      const { importantTerms, categorizedNotes } = await parseIncludedPackage(
        pkg,
      )

      logger.debug(
        `${pkg.packageName} - Important Terms: ${JSON.stringify(
          importantTerms,
          null,
          2,
        )}`,
      )

      logger.debug(
        `${pkg.packageName} - categorizedNotes: ${JSON.stringify(
          categorizedNotes,
          null,
          2,
        )}`,
      )

      includedPackages[index].importantTerms = importantTerms
      includedPackages[index].categorizedNotes = categorizedNotes
    }

    logger.success('Logs have been read, catgorized and stitched togeher.')

    // for (const [index, pkg] of includedPackages.entries()) {
    //   logger.info(`${pkg.packageName} - ${JSON.stringify(pkg, null, 2)}`)
    //   generateReports(pkg)
    // }

    // REmemberto check if reports syill generate when no included but excluded present.
    logger.heading('Generating: Converting JSON to Readable report data...')

    for (const [index, pkg] of includedPackages.entries()) {
      logger.packageReport(pkg)
    }
    // consoleSummaryReport(
    //   includedPackages,
    //   excludedPackages,
    //   options.skipped,
    //   options.summary,
    // )
    // markdownUpdateReport(
    //   includedPackages,
    //   path.join(reportDir, 'update-report.md'),
    // )
    // breakingChangesReport(
    //   [],
    //   path.join(reportDir, 'breaking-changes-report.md'),
    // )

    // Step 5: Write changes (if enabled)
    if (options.write) {
      logger.info('Writing changes to package.json...')
      writeChanges()
    }

    // Step 6: Install dependencies (if enabled)
    if (options.install) {
      logger.info('Installing updated dependencies...')
      installDependencies()
    }

    logger.success('Workflow completed successfully.')
  } catch (error) {
    logger.error(`An error occurred: ${error.message}`)
  }
}

main()
