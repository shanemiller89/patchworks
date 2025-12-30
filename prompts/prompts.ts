import { checkbox } from '@inquirer/prompts'
import { ListrInquirerPromptAdapter } from '@listr2/prompt-adapter-inquirer'
import inquirer from 'inquirer'
import fileSelector from 'inquirer-file-selector'
import _ from 'lodash'
import { customTogglePrompt } from '../prompts/baseToggle.js'
import logger, { summarizeCategorizedNotes } from '../reports/logger.js'
import { styles } from '../reports/styles.js'
import fs from 'fs'
import path from 'path'
import { Level } from '../src/cli/index.js'

// Type definitions
export interface TaskInterface {
  prompt: (adapter: any) => {
    run: (prompt: any, options: any) => Promise<any>
  }
}

export interface PackageChoice {
  name: string
  message: string
  value: string
}

export interface PackageForSelection {
  packageName: string
  categorizedNotes?: any[]
  metadata: {
    current: string
    latest: string
    updateType: string
    updatingDifficulty: number
  }
}

// Register the file selector prompt
inquirer.registerPrompt('file-selector', fileSelector as any)

export async function askToContinue(task: TaskInterface, message: string = 'Do you want to proceed?'): Promise<boolean> {
  try {
    const answer = await task
      .prompt(ListrInquirerPromptAdapter)
      .run(customTogglePrompt, {
        message,
        default: true,
        active: 'Proceed',
        inactive: 'Cancel',
      })
    return answer
  } catch (error) {
    logger.error(`An error occurred during the toggle prompt: ${(error as Error).message}`)
    throw error
  }
}

export async function promptUserForLevel(): Promise<Level> {
  try {
    const { level } = await inquirer.prompt([
      {
        type: 'list',
        name: 'level',
        message: 'Select the maximum update level:',
        choices: [
          {
            name: `${styles.patch(
              'Patch (x.x.1)',
            )} - Bug fixes and minor updates`,
            value: 'patch',
          },
          {
            name: `${styles.minor(
              'Minor (x.1.x)',
            )} - New features (backwards compatible)`,
            value: 'minor',
          },
          {
            name: `${styles.major(
              'Major (1.x.x)',
            )} - High potential for Breaking changes`,
            value: 'major',
          },
        ],
      },
    ])

    logger.info(`Selected update level: ${level}`)
    return level as Level
  } catch (error) {
    logger.error(`An error occurred during level selection: ${(error as Error).message}`)
    throw error
  }
}

export async function promptUserForReportDirectory(task: TaskInterface): Promise<string> {
  const defaultDir: string = path.join(process.cwd(), 'patchworks-reports')

  // Check if the default directory already exists
  try {
    await fs.promises.access(defaultDir)
    logger.info(`Default directory already exists: ${defaultDir}`)
    return defaultDir // Return the existing directory path
  } catch {
    // Directory doesn't exist, continue with prompts
  }

  try {
    // Step 1: Ask if the user wants to specify a custom directory using a toggle
    const useCustomDir: boolean = await task
      .prompt(ListrInquirerPromptAdapter)
      .run(customTogglePrompt, {
        message: `Do you want to specify a custom directory for reports? (Default: ${defaultDir})`,
        default: false,
        active: 'Yes',
        inactive: 'No',
      })

    let reportDir: string

    if (useCustomDir) {
      // Step 2: Use file selector to choose a directory
      reportDir = await task
        .prompt(ListrInquirerPromptAdapter)
        .run(fileSelector as any, {
          message: 'Select a directory for reports:',
          basePath: process.cwd(), // Start from the current working directory
          type: 'directory', // Only allow directory selection
        })

      // Step 3: Ask if the user wants to create a "patchworks-reports" folder
      const createReportsFolder: boolean = await task
        .prompt(ListrInquirerPromptAdapter)
        .run(customTogglePrompt, {
          message:
            'Do you want to create a "patchworks-reports" folder in the selected directory?',
          default: true,
          active: 'Yes',
          inactive: 'No',
        })

      if (createReportsFolder) {
        const reportsFolderPath: string = path.join(reportDir, 'patchworks-reports')
        try {
          await fs.promises.access(reportsFolderPath)
          logger.info(`Directory already exists: ${reportsFolderPath}`)
        } catch {
          await fs.promises.mkdir(reportsFolderPath, { recursive: true })
          logger.info(`Created directory: ${reportsFolderPath}`)
        }
        reportDir = reportsFolderPath // Set the reports folder as the report directory
      }
    } else {
      // Step 4: Create the default "patchworks-reports" folder if it doesn't exist
      await fs.promises.mkdir(defaultDir, { recursive: true })
      logger.info(`Created default directory: ${defaultDir}`)
      reportDir = defaultDir // Use the default directory
    }

    logger.info(`Using report directory: ${reportDir}`)
    return reportDir // Return the final report directory
  } catch (error) {
    logger.error(
      `An error occurred during the directory prompt: ${(error as Error).message}`,
    )
    throw error // Rethrow the error for further handling if needed
  }
}

/**
 * Prompt the user to select packages to update.
 * @param task - The Listr2 task instance to use for prompting.
 * @param packages - List of packages to choose from.
 * @returns The selected packages.
 */
export async function promptUserForPackageSelection(task: TaskInterface, packages: PackageForSelection[]): Promise<PackageForSelection[]> {
  try {
    if (!packages || packages.length === 0) {
      throw new Error('No packages available for selection.')
    }

    const choices: PackageChoice[] = packages.map((packageData) => {
      const { categorizedNotes, metadata } = packageData
      const { updateType, updatingDifficulty } = metadata
      const categoryValues = summarizeCategorizedNotes(categorizedNotes)
      const { breaking_change } = categoryValues

      const hasBreakingChange = !_.isEmpty(breaking_change)
        ? styles.breaking('TRUE')
        : styles.generic('FALSE')
      const styledUpdateType = (styles as any)[updateType](_.upperCase(updateType))

      return {
        name: packageData.packageName,
        message: `${packageData.packageName} (Current: ${
          packageData.metadata.current
        } => Latest: ${
          packageData.metadata.latest
        } - ${styledUpdateType} (Score of ${styles.generic(
          updatingDifficulty.toString(),
        )}) - Potential Breaking Changes: ${hasBreakingChange}`,
        value: packageData.packageName,
      }
    })

    const selectedPackageNames: string[] = await task
      .prompt(ListrInquirerPromptAdapter)
      .run(checkbox, {
        message: 'Select packages to update:',
        choices,
        validate: (value: string[]) =>
          value.length ? true : 'You must select at least one package.',
      })

    const selectedPackages: PackageForSelection[] = packages.filter((packageData) =>
      selectedPackageNames.includes(packageData.packageName),
    )

    if (selectedPackages.length === 0) {
      throw new Error('No packages selected for update.')
    }

    logger.info(`Selected packages: ${selectedPackageNames.join(', ')}`)
    return selectedPackages
  } catch (error) {
    logger.error(`An error occurred during package selection: ${(error as Error).message}`)
    throw error
  }
}
