#!/usr/bin/env node

import { Argument, Command, Option } from 'commander'
import inquirer from 'inquirer'
import { ListrInquirerPromptAdapter } from '@listr2/prompt-adapter-inquirer'
import { color, Listr, PRESET_TIMER, PRESET_TIMESTAMP } from 'listr2'
import fileSelector from 'inquirer-file-selector'
import { parseIncludedPackage } from './analysis/analyzeLogData.js'
import { fetchChangelog } from './versionLogs/fetchChangelog.js'
import { fetchCommits } from './versionLogs/fetchCommits.js'
import { fetchReleaseNotes } from './versionLogs/fetchReleaseNotes.js'
import { bundleReports } from './reports/generateReports.js'
import logger from './reports/logger.js'
import { RELEASE_NOTES, SKIPPED, UNKNOWN } from './utils/constants.js'
import { installDependencies, writeChanges } from './utils/updating-util.js'
import { processPackageVersions } from './utils/versionProcessor.js'
import {
  promptUserForReportDirectory,
  askToContinue,
} from './prompts/prompts.js'
import _ from 'lodash'
import {
  displayResultsTable,
  customTablePrompt,
  displayFinalReports,
} from './reports/consoleTaskReports.js'
import { renderMainMenu } from './mainMenu.js'
import { readConfig } from './utils/configUtil.js'

// Register inquirer prompts
inquirer.registerPrompt('file-selector', fileSelector)

// Set up Commander.js
const program = new Command()

program
  .name('patchworks')
  .description(
    'Patchworks CLI: A utility for managing dependency updates efficiently.',
  )
  .usage('[command] [options]')
  .version('0.0.1')

const sharedArgs = [
  new Argument(
    '<level>',
    'Specify the update level (patch, minor, major)',
    (value) => {
      if (!['patch', 'minor', 'major'].includes(value)) {
        throw new Error('Level must be one of: patch, minor, major')
      }
      return value
    },
  ),
]

const sharedOptions = [
  new Option(
    '-n, --limit <number>',
    'Limit the number of updates processed',
    (value) => {
      const parsedValue = parseInt(value, 10)
      if (isNaN(parsedValue) || parsedValue <= 0) {
        throw new Error('The --limit flag must be a positive integer.')
      }
      return parsedValue
    },
  ),
  new Option(
    '--level-scope <scope>',
    'Control semantic version filtering (strict or cascade)',
    (value) => {
      if (!['strict', 'cascade'].includes(value)) {
        throw new Error("The --level-scope flag must be 'strict' or 'cascade'.")
      }
      return value
    },
    'strict',
  ),
  new Option('-s, --summary', 'Generate a summary report', false),
  new Option('-k, --skipped', 'Show skipped packages in the output', false),
  new Option(
    '--exclude-repoless',
    'Exclude packages without repositories',
    false,
  ),
  new Option('-d, --debug', 'Show verbose debug consoles', false),
  new Option(
    '--show-excluded',
    'Show excluded packages in the console output',
    false,
  ),
  new Option('-i, --install', 'Install dependencies after processing', false),
]

// Default command to show the main menu
program
  .command('menu')
  .description('Display the main menu')
  .addArgument(sharedArgs[0])
  .addOption(sharedOptions[0])
  .addOption(sharedOptions[1])
  .addOption(sharedOptions[2])
  .addOption(sharedOptions[3])
  .addOption(sharedOptions[4])
  .addOption(sharedOptions[5])
  .addOption(sharedOptions[6])
  .addOption(sharedOptions[7])
  .action(async (level, options) => {
    const config = (await readConfig()) || {}

    const finalOptions = {
      level: level || config.level || 'minor',
      limit: options.limit || config.limit || null,
      levelScope: options.levelScope || config.levelScope || 'strict',
      summary: options.summary || config.summary || false,
      skipped: options.skipped || config.skipped || false,
      write: options.write || config.write || false,
      install: options.install || config.install || true,
      excludeRepoless:
        options.excludeRepoless || config.excludeRepoless || false,
      debug: options.debug || config.debug || false,
      showExcluded: options.showExcluded || config.showExcluded || false,
    }

    if (finalOptions.debug) {
      process.env.DEBUG = 'true' // Set DEBUG for the logger
      logger.warn(`ಥ﹏ಥ -- RUNNING IN DEBUG MODE -- (╥﹏╥)`)
    }

    await renderMainMenu(finalOptions)
  })

// Command to run the report-only workflow
program
  .command('reports')
  .description('Run a report-only workflow')
  .addArgument(sharedArgs[0])
  .addOption(sharedOptions[0])
  .addOption(sharedOptions[1])
  .addOption(sharedOptions[2])
  .addOption(sharedOptions[3])
  .addOption(sharedOptions[4])
  .addOption(sharedOptions[5])
  .addOption(sharedOptions[6])
  .action(async (level, options) => {
    const config = (await readConfig()) || {}

    const finalOptions = {
      level: level || config.level || 'minor',
      limit: options.limit || config.limit || null,
      levelScope: options.levelScope || config.levelScope || 'strict',
      summary: options.summary || config.summary || false,
      skipped: options.skipped || config.skipped || false,
      write: options.write || config.write || false,
      excludeRepoless:
        options.excludeRepoless || config.excludeRepoless || false,
      debug: options.debug || config.debug || false,
      showExcluded: options.showExcluded || config.showExcluded || false,
    }

    if (finalOptions.debug) {
      process.env.DEBUG = 'true' // Set DEBUG for the logger
      logger.warn(`ಥ﹏ಥ -- RUNNING IN DEBUG MODE -- (╥﹏╥)`)
    }

    await main({ reportsOnly: true, ...finalOptions }).then(() => {
      process.exit(0)
    })
  })

// Command to run the main update program
program
  .command('update')
  .description('Run the main update program with options')
  .addArgument(sharedArgs[0])
  .addOption(sharedOptions[0])
  .addOption(sharedOptions[1])
  .addOption(sharedOptions[2])
  .addOption(sharedOptions[3])
  .addOption(sharedOptions[4])
  .addOption(sharedOptions[5])
  .addOption(sharedOptions[6])
  .addOption(sharedOptions[7])
  .action(async (level, options) => {
    const config = (await readConfig()) || {}

    const finalOptions = {
      level: level || config.level || 'minor',
      limit: options.limit || config.limit || null,
      levelScope: options.levelScope || config.levelScope || 'strict',
      summary: options.summary || config.summary || false,
      skipped: options.skipped || config.skipped || false,
      write: options.write || config.write || false,
      install: options.install || config.install || true,
      excludeRepoless:
        options.excludeRepoless || config.excludeRepoless || false,
      debug: options.debug || config.debug || false,
      showExcluded: options.showExcluded || config.showExcluded || false,
    }

    if (finalOptions.debug) {
      process.env.DEBUG = 'true' // Set DEBUG for the logger
      logger.warn(`ಥ﹏ಥ -- RUNNING IN DEBUG MODE -- (╥﹏╥)`)
    }

    await main(finalOptions).then(() => {
      process.exit(0)
    })
  })

// Configure custom output for errors
program.configureOutput({
  outputError: (str, write) => {
    write('')
    logger.error(str.trim()) // Use logger for errors
    program.help() // Show help menu
  },
})

program.parse(process.argv)

export async function main(options) {
  const { reportsOnly } = options

  const tasks = new Listr(
    [
      // Step 1: Prompt user for custom directory
      {
        title: 'Check for or create Reporting Directory',
        task: async (ctx, task) => {
          ctx.reportDir = await promptUserForReportDirectory(task)
        },
      },
      // Step 2: Evaluate outdated dependencies
      {
        title: 'Evaluate outdated packages',
        task: async (ctx, task) => {
          return await processPackageVersions(task, options)
        },
      },
      // Step 3: Fetch release notes and changelogs
      {
        title: 'Fetch release notes and changelogs',
        task: async (ctx, task) => {
          const subTasks = ctx.includedPackages.map((pkg) => ({
            title: `Fetch data for ${pkg.packageName}`,
            task: async (ctx, task) => {
              const { packageName, metadata } = pkg

              return task.newListr(
                [
                  {
                    title: 'Fetch release notes',
                    enabled: () => metadata.releaseNotesCompatible,
                    task: async (ctx) => {
                      pkg.releaseNotes = await fetchReleaseNotes({
                        packageName,
                        metadata,
                      })
                      if (pkg.releaseNotes) {
                        pkg.changelog = SKIPPED
                        pkg.source = RELEASE_NOTES
                        ctx.source = RELEASE_NOTES
                      } else {
                        pkg.releaseNotes = SKIPPED
                        pkg.source = UNKNOWN
                        ctx.source = UNKNOWN
                      }

                      return (pkg.attemptedReleaseNotes = true)
                    },
                  },
                  {
                    title: 'Fetch changelog',
                    enabled: () => metadata.fallbackACompatible,
                    skip: (ctx) => ctx.source === RELEASE_NOTES,
                    task: async (ctx) => {
                      pkg.changelog = await fetchChangelog({
                        packageName,
                        metadata,
                      })
                      if (pkg.changelog) {
                        pkg.releaseNotes = SKIPPED
                        pkg.source = 'fallbackA'
                        ctx.source = 'fallbackA'
                      } else {
                        pkg.changelog = SKIPPED
                        pkg.source = UNKNOWN
                        ctx.source = UNKNOWN
                      }

                      return (pkg.attemptedFallbackA = true)
                    },
                  },
                  {
                    title: 'Fetch commits',
                    enabled: () => metadata.fallbackBCompatible,
                    skip: (ctx) =>
                      ctx.source === RELEASE_NOTES ||
                      ctx.source === 'fallbackA',
                    task: async (ctx) => {
                      pkg.changelog = await fetchCommits({
                        packageName,
                        metadata,
                      })
                      if (pkg.changelog) {
                        pkg.releaseNotes = SKIPPED
                        pkg.source = 'fallbackB'
                        ctx.source = 'fallbackB'
                      } else {
                        pkg.changelog = SKIPPED
                        pkg.releaseNotes = SKIPPED
                        pkg.source = UNKNOWN
                        ctx.source = UNKNOWN
                      }

                      return (pkg.attemptedFallbackB = true)
                    },
                  },
                  {
                    title: 'Set unknown status',
                    enabled: () =>
                      !metadata.releaseNotesCompatible &&
                      !metadata.fallbackACompatible &&
                      !metadata.fallbackBCompatible,
                    task: async () => {
                      if (!pkg.releaseNotes && !pkg.changelog) {
                        pkg.changelog = UNKNOWN
                        pkg.releaseNotes = UNKNOWN
                        pkg.source = UNKNOWN
                      }
                    },
                  },
                ],
                { concurrent: false, exitOnError: false },
              )
            },
          }))

          return task.newListr(subTasks, { concurrent: false })
        },
      },
      // New Task: Display results and ask to proceed
      {
        title: 'Display results and ask to proceed',
        task: async (ctx, task) => {
          const resultsTable = await displayResultsTable(ctx.includedPackages)
          task.output = `Results:\n${resultsTable}`

          const shouldContinue = await askToContinue(
            task,
            'Proceed to parse and categorize logs?',
          )
          if (!shouldContinue) {
            throw new Error('Operation cancelled by the user.')
          }
        },
        rendererOptions: { bottomBar: 999 },
      },
      // Step 4: Parse and categorize logs
      {
        title: 'Parse and categorize logs',
        task: async (ctx, task) => {
          const subTasks = ctx.includedPackages.map((pkg) => ({
            title: `Parse logs for ${pkg.packageName}`,
            skip: () => {
              const { releaseNotes, changelog } = pkg
              return (_.isEmpty(releaseNotes) ||
                releaseNotes === UNKNOWN ||
                releaseNotes === SKIPPED) &&
                (!changelog || changelog === UNKNOWN || changelog === SKIPPED)
                ? 'Both releaseNotes and changelog are unavailable, skipping parsing.'
                : false
            },
            task: async () => {
              const result = await parseIncludedPackage(pkg)
              pkg.importantTerms = result.importantTerms
              pkg.categorizedNotes = result.categorizedNotes
            },
          }))

          return task.newListr(subTasks, { concurrent: false })
        },
      },
      // Step 5: Generate pre-update reports
      {
        title: 'Select packages to update',
        enabled: () => !reportsOnly,
        task: async (ctx, task) => {
          // Use the custom table prompt to select packages
          ctx.selectedPackages = await task
            .prompt(ListrInquirerPromptAdapter)
            .run(customTablePrompt, {
              packages: ctx.includedPackages,
              task: task,
            })
        },
        rendererOptions: { bottomBar: 999 },
      },
      // Step 6: Select packages to update
      // Step 7: Write changes to package.json (optional)
      {
        title: 'Write changes to package.json',
        enabled: () => !reportsOnly,
        task: async (ctx) => {
          await writeChanges(ctx.selectedPackages)
        },
      },
      // Step 8: Install updated dependencies (optional)
      {
        title: 'Install updated dependencies',
        enabled: () => options.install && !reportsOnly,
        task: async () => {
          installDependencies()
        },
      },
      {
        title: 'Final Reports',
        task: async (ctx, task) => {
          if (!reportsOnly) {
            const finalReports = await displayFinalReports(ctx.selectedPackages)
            const reports = await bundleReports(
              ctx.selectedPackages,
              ctx.reportDir,
            )
            task.title = reports
            task.output = finalReports
          } else {
            const finalReports = await displayFinalReports(ctx.includedPackages)
            const reports = await bundleReports(
              ctx.includedPackages,
              ctx.reportDir,
            )
            task.title = reports
            task.output = finalReports
          }
        },
        rendererOptions: { bottomBar: 999, persistentOutput: true },
      },
    ],
    {
      collectErrors: 'full',
      concurrent: false,
      exitOnError: true,
      prompt: new ListrInquirerPromptAdapter(),
      rendererOptions: {
        collapseSubtasks: false,
        collapseSkips: false,
        collapseErrors: false,
        timestamp: PRESET_TIMESTAMP,
        timer: {
          ...PRESET_TIMER,
          condition: (duration) => duration > 250,
          format: (duration) => {
            return duration > 10000 ? color.red : color.green
          },
        },
      },
    },
  )

  try {
    await tasks.run()
    logger.success('Workflow completed successfully!')
  } catch (err) {
    logger.error(`Workflow failed: ${err.message}`)
  }
}

// main().then(() => {
//   process.exit(0)
// })

// Step 5: Generate pre-update reports
// {
//   title: 'Generate pre-update reports',
//   task: async (ctx, task) => {
//     const subTasks = ctx.includedPackages.map((pkg) => ({
//       title: `Generate report for ${pkg.packageName}`,
//       skip: () => {
//         const { releaseNotes, changelog } = pkg
//         return (!releaseNotes ||
//           releaseNotes === UNKNOWN ||
//           releaseNotes === SKIPPED) &&
//           (!changelog || changelog === UNKNOWN || changelog === SKIPPED)
//           ? 'No release notes or changelog available, skipping report generation.'
//           : false
//       },
//       task: async () => {
//         generateReports(pkg)
//         logger.packageReport(pkg)
//       },
//     }))

//     return task.newListr(subTasks, { concurrent: false })
//   },
// },
