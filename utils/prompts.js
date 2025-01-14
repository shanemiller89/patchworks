// utils/prompts.js

import logger from '../reports/logger.js'
import { styles } from '../reports/styles.js'
import readline from 'readline'

/**
 * Prompts the user with a yes/no question.
 * @param {string} message - The question to display to the user.
 * @returns {Promise<boolean>} - Resolves with true if the user answers 'y', otherwise false.
 */
export async function promptUser(message) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    rl.question(`${message} (y/n): `, (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === 'y')
    })
  })
}

/**
 * Prompts the user to decide whether to use a custom directory for reports.
 * @returns {Promise<boolean>} - Resolves with true if the user wants a custom directory.
 */
export async function promptUserForDirectory() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    const askQuestion = () => {
      rl.question(
        styles.generic(
          'Do you want to save reports in a dedicated directory (update_reports)? (y/n) ',
        ),
        (answer) => {
          const lowerAnswer = answer.toLowerCase()
          if (lowerAnswer === 'y' || lowerAnswer === 'n') {
            rl.close()
            resolve(lowerAnswer === 'y')
          } else {
            logger.message('Please answer with "y" or "n".')
            askQuestion() // Reprompt
          }
        },
      )
    }

    askQuestion()
  })
}
