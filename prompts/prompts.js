import { checkbox, select } from '@inquirer/prompts'
import { ListrInquirerPromptAdapter } from '@listr2/prompt-adapter-inquirer'
import inquirer from 'inquirer'
import fileSelector from 'inquirer-file-selector'
// eslint-disable-next-line lodash/import-scope
import _ from 'lodash'
import { customTogglePrompt } from '../prompts/baseToggle.js'
import logger, { summarizeCategorizedNotes } from '../reports/logger.js'
import { styles } from '../reports/styles.js'
import fs from 'fs'
import path from 'path'

// Register the file selector prompt
inquirer.registerPrompt('file-selector', fileSelector)

export async function askToContinue(task, message = 'Do you want to proceed?') {
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
    logger.error(`An error occurred during the toggle prompt: ${error.message}`)
    throw error
  }
}

export async function promptUserForLevel() {
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

    console.log(`Selected update level: ${level}`)
    return level
  } catch (error) {
    console.error(`An error occurred during level selection: ${error.message}`)
    throw error
  }
}

export async function promptUserForReportDirectory(task) {
  const defaultDir = path.join(process.cwd(), 'patchworks-reports')

  // Check if the default directory already exists
  if (fs.existsSync(defaultDir)) {
    logger.info(`Default directory already exists: ${defaultDir}`)
    return defaultDir // Return the existing directory path
  }

  try {
    // Step 1: Ask if the user wants to specify a custom directory using a toggle
    const useCustomDir = await task
      .prompt(ListrInquirerPromptAdapter)
      .run(customTogglePrompt, {
        message: `Do you want to specify a custom directory for reports? (Default: ${defaultDir})`,
        default: false,
        active: 'Yes',
        inactive: 'No',
      })

    let reportDir

    if (useCustomDir) {
      // Step 2: Use file selector to choose a directory
      reportDir = await task
        .prompt(ListrInquirerPromptAdapter)
        .run(fileSelector, {
          message: 'Select a directory for reports:',
          basePath: process.cwd(), // Start from the current working directory
          type: 'directory', // Only allow directory selection
        })

      // Step 3: Ask if the user wants to create a "patchworks-reports" folder
      const createReportsFolder = await task
        .prompt(ListrInquirerPromptAdapter)
        .run(customTogglePrompt, {
          message:
            'Do you want to create a "patchworks-reports" folder in the selected directory?',
          default: true,
          active: 'Yes',
          inactive: 'No',
        })

      if (createReportsFolder) {
        const reportsFolderPath = path.join(reportDir, 'patchworks-reports')
        if (!fs.existsSync(reportsFolderPath)) {
          fs.mkdirSync(reportsFolderPath, { recursive: true })
          logger.info(`Created directory: ${reportsFolderPath}`)
        } else {
          logger.info(`Directory already exists: ${reportsFolderPath}`)
        }
        reportDir = reportsFolderPath // Set the reports folder as the report directory
      }
    } else {
      // Step 4: Create the default "patchworks-reports" folder if it doesn't exist
      fs.mkdirSync(defaultDir, { recursive: true })
      logger.info(`Created default directory: ${defaultDir}`)
      reportDir = defaultDir // Use the default directory
    }

    logger.info(`Using report directory: ${reportDir}`)
    return reportDir // Return the final report directory
  } catch (error) {
    logger.error(
      `An error occurred during the directory prompt: ${error.message}`,
    )
    throw error // Rethrow the error for further handling if needed
  }
}

/**
 * Prompt the user to select packages to update.
 * @param {Object} task - The Listr2 task instance to use for prompting.
 * @param {Array} packages - List of packages to choose from.
 * @returns {Promise<Array>} The selected packages.
 */
export async function promptUserForPackageSelection(task, packages) {
  try {
    if (!packages || packages.length === 0) {
      throw new Error('No packages available for selection.')
    }

    const choices = packages.map((pkg) => {
      const { categorizedNotes, metadata } = pkg
      const { updateType, updatingDifficulty } = metadata
      const categoryValues = summarizeCategorizedNotes(categorizedNotes)
      const { breaking_change } = categoryValues

      const hasBreakingChange = !_.isEmpty(breaking_change)
        ? styles.breaking('TRUE')
        : styles.generic('FALSE')
      const styledUpdateType = styles[updateType](_.upperCase(updateType))

      return {
        name: pkg.packageName,
        message: `${pkg.packageName} (Current: ${
          pkg.metadata.current
        } => Latest: ${
          pkg.metadata.latest
        } - ${styledUpdateType} (Score of ${styles.generic(
          updatingDifficulty,
        )}) - Potential Breaking Changes: ${hasBreakingChange}`,
        value: pkg.packageName,
      }
    })

    const selectedPackageNames = await task
      .prompt(ListrInquirerPromptAdapter)
      .run(checkbox, {
        message: 'Select packages to update:',
        choices,
        validate: (value) =>
          value.length ? true : 'You must select at least one package.',
      })

    const selectedPackages = packages.filter((pkg) =>
      selectedPackageNames.includes(pkg.packageName),
    )

    if (selectedPackages.length === 0) {
      throw new Error('No packages selected for update.')
    }

    logger.info(`Selected packages: ${selectedPackageNames.join(', ')}`)
    return selectedPackages
  } catch (error) {
    logger.error(`An error occurred during package selection: ${error.message}`)
    throw error
  }
}
