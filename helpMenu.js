import { align, centerAlign } from './utils/alignmentHelpers.js'
import { MAIN_TITLE } from './utils/constants.js'

/**
 * Displays the help menu for the Patchworks CLI and waits for the user to press enter.
 */
export function displayHelpMenu(rl) {
  return new Promise((resolve, reject) => {
    try {
      console.log(align(MAIN_TITLE, centerAlign))
      console.log(`
      A utility for managing dependency updates efficiently.

      Example Usage:
        $ patchworks menu
        $ patchworks reports
        $ patchworks update --level=minor --limit=5

      Commands:
        menu                  Display the main menu.
        reports               Run a report-only workflow.
        update                Run the main update program with options.

      Required for 'update' command:
        --level <level>       Specify the update level (patch, minor, major).

      Optional for 'update' command:
        --limit <number>      Limit the number of updates processed (default: no limit).
        --level-scope <scope> Control semantic version filtering (strict or cascade).
        --summary             Generate a summary report.
        --skipped             Show skipped packages in the output.
        --write               Persist changes to package.json.
        --install             Install updated dependencies.
        --exclude-repoless    Skip packages without repository links.
        --show-excluded       Show excluded packages in the console output.

      ==============================================
      For more information, visit:
      https://github.com/shanemiller89/patchworks
      ==============================================
      `)

      console.log('Press Enter to return to the main menu...')
      rl.on('line', () => {
        rl.close() // Close the readline interface
        resolve() // Resolve the promise when the user presses enter
      })

      rl.on('error', (err) => {
        console.error('Error with readline:', err)
        reject(err)
      })

      // Resume the input stream if needed
      process.stdin.resume()
    } catch (error) {
      console.error('Error displaying help menu:', error)
      reject(error)
    }
  })
}
