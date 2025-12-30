#!/usr/bin/env node

import { Argument, Command, Option } from 'commander'
import inquirer from 'inquirer'
import fileSelector from 'inquirer-file-selector'
import logger from '../../reports/logger.js'
import { createOutputErrorHandler } from './errorHandler.js'
import { renderMainMenu } from '../../menus/mainMenu.js'
import { readConfig, PatchworksConfig } from '../../config/configUtil.js'
import { resolveInstallFlag } from './installOption.js'
import { main } from '../../tasks/main.js'
import { resolveBooleanOption } from './booleanOption.js'

// Type definitions
export type Level = 'patch' | 'minor' | 'major'

export interface CLIOptions {
  limit?: number
  levelScope?: 'strict' | 'cascade'
  summary?: boolean
  skipped?: boolean
  write?: boolean
  install?: boolean
  excludeRepoless?: boolean
  debug?: boolean
  showExcluded?: boolean
  aiSummary?: boolean
}

export interface FinalOptions {
  level: Level | null
  limit: number | null
  levelScope: 'strict' | 'cascade'
  summary: boolean
  skipped: boolean
  write: boolean
  install: boolean
  excludeRepoless: boolean
  debug: boolean
  showExcluded: boolean
  aiSummary: boolean
  reportsOnly?: boolean
}

export interface CreateLevelArgOptions {
  menu?: boolean
}

// Register inquirer prompts
inquirer.registerPrompt('file-selector', fileSelector as any)

function createLevelArg(options: CreateLevelArgOptions = { menu: false }): Argument {
  const { menu = false } = options
  if (menu) {
    return new Argument(
      '[level]',
      'Specify the update level (patch, minor, major)'
    ).argParser((value: string): Level | undefined => {
      if (value && !['patch', 'minor', 'major'].includes(value)) {
        throw new Error('Level must be one of: patch, minor, major')
      }
      return value as Level | undefined
    })
  }

  return new Argument(
    '<level>',
    'Specify the update level (patch, minor, major)'
  ).argParser((value: string): Level => {
    if (!['patch', 'minor', 'major'].includes(value)) {
      throw new Error('Level must be one of: patch, minor, major')
    }
    return value as Level
  })
}

const sharedOptions: Option[] = [
  new Option(
    '-n, --limit <number>',
    'Limit the number of updates processed'
  ).argParser((value: string): number => {
    const parsedValue = parseInt(value, 10)
    if (isNaN(parsedValue) || parsedValue <= 0) {
      throw new Error('The --limit flag must be a positive integer.')
    }
    return parsedValue
  }),
  new Option(
    '--level-scope <scope>',
    'Control semantic version filtering (strict or cascade)'
  ).argParser((value: string): 'strict' | 'cascade' => {
    if (!['strict', 'cascade'].includes(value)) {
      throw new Error("The --level-scope flag must be 'strict' or 'cascade'.")
    }
    return value as 'strict' | 'cascade'
  }).default('strict'),
  new Option('-s, --summary', 'Generate a summary report'),
  new Option('-k, --skipped', 'Show skipped packages in the output'),
  new Option(
    '--exclude-repoless',
    'Exclude packages without repositories'
  ),
  new Option('-d, --debug', 'Show verbose debug consoles'),
  new Option(
    '--show-excluded',
    'Show excluded packages in the console output'
  ),
  new Option('-i, --install', 'Install dependencies after processing'),
  new Option(
    '--ai-summary',
    'Generate AI-powered critical findings summary (requires API key in config)'
  ),
]

export default function (): void {
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
    .addOption(sharedOptions[8])
    .action(async (level: Level | undefined, options: CLIOptions) => {
      const config: PatchworksConfig | null = (await readConfig()) || null

      const finalOptions: FinalOptions = {
        level: level ?? config?.level ?? null,
        limit: options.limit ?? config?.limit ?? null,
        levelScope: options.levelScope ?? config?.levelScope ?? 'strict',
        summary: resolveBooleanOption(options.summary, config?.summary, false),
        skipped: resolveBooleanOption(options.skipped, config?.skipped, false),
        write: resolveBooleanOption(options.write, config?.write, false),
        install: resolveInstallFlag(options.install, config?.install),
        excludeRepoless: resolveBooleanOption(
          options.excludeRepoless,
          config?.excludeRepoless,
          false,
        ),
        debug: resolveBooleanOption(options.debug, config?.debug, false),
        showExcluded: resolveBooleanOption(
          options.showExcluded,
          config?.showExcluded,
          false,
        ),
        aiSummary: resolveBooleanOption(
          options.aiSummary,
          config?.ai?.enabled,
          false,
        ),
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
    .addOption(sharedOptions[8])
    .action(async (level: Level, options: CLIOptions) => {
      const config: PatchworksConfig | null = (await readConfig()) || null

      const finalOptions: FinalOptions = {
        level: level ?? config?.level ?? 'minor',
        limit: options.limit ?? config?.limit ?? null,
        levelScope: options.levelScope ?? config?.levelScope ?? 'strict',
        summary: resolveBooleanOption(options.summary, config?.summary, false),
        skipped: resolveBooleanOption(options.skipped, config?.skipped, false),
        write: resolveBooleanOption(options.write, config?.write, false),
        install: resolveInstallFlag(options.install, config?.install, false),
        excludeRepoless: resolveBooleanOption(
          options.excludeRepoless,
          config?.excludeRepoless,
          false,
        ),
        debug: resolveBooleanOption(options.debug, config?.debug, false),
        showExcluded: resolveBooleanOption(
          options.showExcluded,
          config?.showExcluded,
          false,
        ),
        aiSummary: resolveBooleanOption(
          options.aiSummary,
          config?.ai?.enabled,
          false,
        ),
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
    .addOption(sharedOptions[8])
    .action(async (level: Level, options: CLIOptions) => {
      const config: PatchworksConfig | null = (await readConfig()) || null

      const finalOptions: FinalOptions = {
        level: level ?? config?.level ?? 'minor',
        limit: options.limit ?? config?.limit ?? null,
        levelScope: options.levelScope ?? config?.levelScope ?? 'strict',
        summary: resolveBooleanOption(options.summary, config?.summary, false),
        skipped: resolveBooleanOption(options.skipped, config?.skipped, false),
        write: resolveBooleanOption(options.write, config?.write, false),
        install: resolveInstallFlag(options.install, config?.install),
        excludeRepoless: resolveBooleanOption(
          options.excludeRepoless,
          config?.excludeRepoless,
          false,
        ),
        debug: resolveBooleanOption(options.debug, config?.debug, false),
        showExcluded: resolveBooleanOption(
          options.showExcluded,
          config?.showExcluded,
          false,
        ),
        aiSummary: resolveBooleanOption(
          options.aiSummary,
          config?.ai?.enabled,
          false,
        ),
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
    outputError: createOutputErrorHandler(program),
  })

  program.parse(process.argv)
}
