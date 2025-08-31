import boxen from 'boxen'
import chalk from 'chalk'
import { getBorderCharacters, table } from 'table'
import { displayHelpMenu } from './helpMenu.js'
import { main } from '../tasks/main.js'
import { styles } from '../reports/styles.js'
import { generateConfig, readConfig, PatchworksConfig } from '../config/configUtil.js'
import { MAIN_TITLE } from '../utils/constants.js'
import readline from 'readline'
import { promptUserForLevel } from '../prompts/prompts.js'
import { FinalOptions, Level } from '../src/cli/index.js'

const DOUBLE_LINE =
  '======================================================================================================================'
const SINGLE_LINE =
  '----------------------------------------------------------------------------------------------------------------------'

export interface MenuOptions {
  level?: Level | null
  limit?: number | null
  levelScope?: 'strict' | 'cascade'
  summary?: boolean
  showExcluded?: boolean
  install?: boolean
  skipped?: boolean
  write?: boolean
  excludeRepoless?: boolean
  debug?: boolean
}

// Render the Patchworks title and configuration
export async function renderMainMenu(options: MenuOptions): Promise<void> {
  // Read configuration from the config file
  const config: PatchworksConfig | null = (await readConfig()) || null

  const {
    level = options.level || config?.level || 'minor',
    limit = options.limit || config?.limit || null,
    levelScope = options.levelScope || config?.levelScope || 'strict',
    summary = options.summary || config?.summary || false,
    showExcluded = options.showExcluded || config?.showExcluded || false,
    install = options.install || config?.install || true,
  } = options

  let selectedIndex: number = 0

  let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  })

  readline.emitKeypressEvents(process.stdin)
  if (process.stdin.isTTY) process.stdin.setRawMode(true)

  const renderMenu = (): void => {
    console.clear()
    console.log(
      boxen(chalk.blue.bold(MAIN_TITLE), {
        title: chalk.blue(
          'Stitching Your Changelog Chaos into Seamless Updates.',
        ),
        titleAlignment: 'center',
        padding: 1,
        margin: { left: 8, right: 1, top: 1, bottom: 1 },
        borderStyle: 'double',
        borderColor: 'blue',
        backgroundColor: 'black',
      } as any),
    )

    // Configuration details with ASCII symbols
    const configDetails: string = `
${chalk.blue(DOUBLE_LINE)}
  ${chalk.bold.blue.italic('Patchworks Configuration')}
${chalk.blue(DOUBLE_LINE)}
  ${chalk.white('★')} ${chalk.gray.bold('Update Level:')}               ${
      !level ? chalk.redBright('Not Set') : chalk.greenBright(level)
    }
  ${chalk.white('♯')} ${chalk.gray.bold(
      'Max Updates:',
    )}                ${chalk.greenBright(limit || 'Infinite')}
  ${chalk.white('◈')} ${chalk.gray.bold(
      'Dependency Scope:',
    )}           ${chalk.greenBright(levelScope)}
${chalk.blue(SINGLE_LINE)}
  ${chalk.white('✿')} ${chalk.gray.bold('Summary Mode:')}               ${
      summary ? chalk.green('Enabled') : chalk.red('Disabled')
    }
  ${chalk.white('☒')} ${chalk.gray.bold('Show Excluded:')}              ${
      showExcluded ? chalk.green('Enabled') : chalk.red('Disabled')
    }
  ${chalk.white('♨')} ${chalk.gray.bold('Install Dependencies:')}            ${
      install ? chalk.green('Enabled') : chalk.red('Disabled')
    }
${chalk.blue(DOUBLE_LINE)}
  `

    console.log(chalk.cyan(configDetails))

    const updateTable = table(
      [
        [
          selectedIndex === 0
            ? chalk.bgCyanBright.bold.blackBright('► [1] Run Patchworks Main')
            : '  [1] Run Patchworks Main',
        ],
        [
          selectedIndex === 1
            ? chalk.bgCyanBright.bold.blackBright(
                '↻ [2] Run Patchworks Main All',
              )
            : '  [2] Run Patchworks Main All',
        ],
      ],
      {
        header: { content: styles.columnHeader('Update') },
        columnDefault: { width: 50 },
      },
    )

    const reportsTable = table(
      [
        [
          selectedIndex === 2
            ? chalk.bgCyanBright.bold.blackBright('✎ [3] Generate Reports Only')
            : '  [3] Generate Reports Only',
        ],
        [
          selectedIndex === 3
            ? chalk.bgCyanBright.bold.blackBright('✎ [4] Generate Reports All')
            : '  [4] Generate Reports All',
        ],
      ],
      {
        header: { content: styles.columnHeader('Reports') },
        columnDefault: { width: 50 },
      },
    )

    const otherTable = table(
      [
        [
          selectedIndex === 4
            ? chalk.bgCyanBright.bold.blackBright('⚙ [5] Generate Config')
            : '  [5] Generate Config',
        ],
        [
          selectedIndex === 5
            ? chalk.bgCyanBright.bold.blackBright(
                '☉ [6] Help and Documentation',
              )
            : '  [6] Help and Documentation',
        ],
        [
          selectedIndex === 6
            ? chalk.bgCyanBright.bold.blackBright('✖ [7] Exit')
            : '  [7] Exit',
        ],
      ],
      {
        header: { content: styles.columnHeader('Other') },
        columnDefault: { width: 50 },
      },
    )

    const menuGrid = table(
      [
        [updateTable, '', reportsTable],
        [otherTable, '', ''],
      ],
      {
        border: getBorderCharacters('void'),
        columns: {
          0: { width: 60 },
          1: { width: 1 },
          2: { width: 60 },
        },
        columnDefault: {
          paddingLeft: 0,
          paddingRight: 1,
        },
        drawHorizontalLine: () => false,
      },
    )

    console.log(menuGrid)
    console.log(chalk.blue(DOUBLE_LINE))
    console.log(
      chalk.blue(
        `Use ${chalk.bold.blueBright(
          '↑ ↓',
        )} keys to navigate, press ${chalk.bold.blueBright(
          'Enter',
        )} to select.`,
      ),
    )
  }

  // Define the keypress handler function
  const keypressHandler = async (str: string, key: readline.Key): Promise<void> => {
    if (key.name === 'up') {
      selectedIndex = (selectedIndex - 1 + 7) % 7
    } else if (key.name === 'down') {
      selectedIndex = (selectedIndex + 1) % 7
    } else if (key.name === 'return') {
      switch (selectedIndex) {
        case 0: {
          console.log('Running Patchworks Main...')
          let runLevel: Level | null = level as Level | null
          if (!level) {
            // Temporarily disable raw mode and keypress events
            process.stdin.setRawMode(false)
            process.stdin.removeAllListeners('keypress')

            runLevel = await promptUserForLevel()

            // Restore raw mode and keypress events
            if (process.stdin.isTTY) process.stdin.setRawMode(true)
            readline.emitKeypressEvents(process.stdin)
            process.stdin.on('keypress', keypressHandler)
          }
          // Clean up event listeners and stdin before running main
          process.stdin.removeAllListeners('keypress')
          if (process.stdin.isTTY) process.stdin.setRawMode(false)
          rl.close()

          const finalOptions: FinalOptions = {
            level: runLevel,
            limit,
            levelScope,
            summary,
            showExcluded,
            install,
            skipped: false,
            write: false,
            excludeRepoless: false,
            debug: false,
          }

          return await main(finalOptions).then(() => {
            process.exit(0)
          })
        }
        case 1: {
          console.log('Running Patchworks Main All...')
          // Clean up event listeners and stdin
          process.stdin.removeAllListeners('keypress')
          if (process.stdin.isTTY) process.stdin.setRawMode(false)
          rl.close()

          const finalOptions: FinalOptions = {
            level: 'major',
            levelScope: 'cascade',
            limit: null,
            summary: false,
            skipped: false,
            write: false,
            install: true,
            excludeRepoless: false,
            debug: false,
            showExcluded: false,
          }

          return await main(finalOptions)
        }
        case 2: {
          console.log('Generating Reports Only...')
          
          const finalOptions: FinalOptions = {
            reportsOnly: true,
            level,
            limit,
            levelScope,
            summary,
            showExcluded,
            install,
            skipped: false,
            write: false,
            excludeRepoless: false,
            debug: false,
          }

          return await main(finalOptions).then(() => {
            process.exit(0)
          })
        }
        case 3: {
          console.log('Generating Reports All...')
          
          const finalOptions: FinalOptions = {
            reportsOnly: true,
            level: 'major',
            levelScope: 'cascade',
            showExcluded: true,
            limit: null,
            summary: false,
            skipped: false,
            write: false,
            install: true,
            excludeRepoless: false,
            debug: false,
          }

          return await main(finalOptions).then(() => {
            process.exit(0)
          })
        }
        case 4:
          console.log('Generating Config...')
          await generateConfig().then(() => {
            process.exit(0)
          })
          console.log('Config generated successfully!')
          break
        case 5:
          console.log('Displaying Help and Documentation...')
          rl.pause()
          await displayHelpMenu(rl)
          rl.resume()
          renderMenu()
          break
        case 6:
          console.log('Exiting...')
          process.exit(0)
      }
    }
    renderMenu()
  }

  // Initial setup of keypress handler
  process.stdin.on('keypress', keypressHandler)
  renderMenu()
}
