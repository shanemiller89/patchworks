#!/usr/bin/env node

import { Argument, Command, Option } from 'commander'
import inquirer from 'inquirer'
import fileSelector from 'inquirer-file-selector'
import logger from '../../reports/logger.js'
import { renderMainMenu } from '../../menus/mainMenu.js'
import { readConfig } from '../../config/configUtil.js'
import { main } from '../../tasks/main.js'

// Register inquirer prompts
inquirer.registerPrompt('file-selector', fileSelector)

function createLevelArg(options = { menu: false }) {
  const { menu = false } = options
  if (menu) {
    return new Argument(
      '[level]',
      'Specify the update level (patch, minor, major)',
      (value) => {
        if (value && !['patch', 'minor', 'major'].includes(value)) {
          throw new Error('Level must be one of: patch, minor, major')
        }
        return value
      },
    )
  }

  return new Argument(
    '<level>',
    'Specify the update level (patch, minor, major)',
    (value) => {
      if (!['patch', 'minor', 'major'].includes(value)) {
        throw new Error('Level must be one of: patch, minor, major')
      }
      return value
    },
  )
}

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

export default function () {
  // Set up Commander.js
  const program = new Command()

  program
    .name('patchworks')
    .description(
      'Patchworks CLI: A utility for managing dependency updates efficiently.',
    )
    .usage('[command] [options]')
    .version('0.1.0')

  // Default command to show the main menu
  program
    .command('menu')
    .description('Display the main menu')
    .addArgument(createLevelArg({ menu: true }))
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
        level: level || config.level || null,
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
    .addArgument(createLevelArg())
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
    .addArgument(createLevelArg())
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
}
