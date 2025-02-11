import boxen from 'boxen'
import chalk from 'chalk'
import { getBorderCharacters, table } from 'table'
import { displayHelpMenu } from './helpMenu.js'
import { main } from './patchworks.mjs'
import { styles } from './reports/styles.js'
import { align, centerAlign } from './utils/alignmentHelpers.js'
import { generateConfig, readConfig } from './utils/configUtil.js'
import { MAIN_TITLE } from './utils/constants.js'
import readline from 'readline'

const DOUBLE_LINE =
  '======================================================================================================================'
const SINGLE_LINE =
  '----------------------------------------------------------------------------------------------------------------------'
// Render the Patchworks title and configuration
export async function renderMainMenu(options) {
  // Read configuration from the config file
  const config = (await readConfig()) || {}

  const {
    level = options.level || config.level || 'minor',
    limit = options.limit || config.limit || null,
    levelScope = options.levelScope || config.levelScope || 'strict',
    summary = options.summary || config.summary || false,
    showExcluded = options.showExcluded || config.showExcluded || false,
    installUpdates = options.install || config.install || true,
  } = options

  let selectedIndex = 0

  let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  })

  readline.emitKeypressEvents(process.stdin)
  if (process.stdin.isTTY) process.stdin.setRawMode(true)

  const renderMenu = () => {
    console.clear()
    console.log(
      boxen(chalk.blue.bold(align(MAIN_TITLE, centerAlign)), {
        title: chalk.blue(
          'Stitching Your Changelog Chaos into Seamless Updates.',
        ),
        titleAlignment: 'center',
        padding: 1,
        margin: { left: 8, right: 1, top: 1, bottom: 1 },
        borderStyle: 'double',
        borderColor: 'blue',
        backgroundColor: 'black',
      }),
    )

    // Configuration details with ASCII symbols
    const configDetails = `
${chalk.blue(DOUBLE_LINE)}
  ${chalk.bold.blue.italic('Patchworks Configuration')}
${chalk.blue(DOUBLE_LINE)}
  ${chalk.white('★')} ${chalk.gray.bold(
      'Update Level:',
    )}               ${chalk.greenBright(level)}
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
  ${chalk.white('♨')} ${chalk.gray.bold('Install Updates:')}            ${
      installUpdates ? chalk.green('Enabled') : chalk.red('Disabled')
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
    console.log(chalk.blue('Use ↑ ↓ keys to navigate, press Enter to select.'))
  }

  renderMenu()

  process.stdin.on('keypress', async (str, key) => {
    if (key.name === 'up') {
      selectedIndex = (selectedIndex - 1 + 7) % 7
    } else if (key.name === 'down') {
      selectedIndex = (selectedIndex + 1) % 7
    } else if (key.name === 'return') {
      switch (selectedIndex) {
        case 0:
          console.log('Running Patchworks Main...')
          await main({
            level,
            limit,
            levelScope,
            summary,
            showExcluded,
            installUpdates,
          })
          break
        case 1:
          console.log('Running Patchworks Main All...')
          await main({ level: 'major', levelScope: 'cascade' })
          break
        case 2:
          console.log('Generating Reports Only...')
          await main({
            reportsOnly: true,
            level,
            limit,
            levelScope,
            summary,
            showExcluded,
            installUpdates,
          })
          break
        case 3:
          console.log('Generating Reports All...')
          await main({
            reportsOnly: true,
            level: 'major',
            levelScope: 'cascade',
            showExcluded: true,
          })
          break
        case 4:
          console.log('Generating Config...')
          await generateConfig()
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
  })
}
