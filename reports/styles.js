import chalk from 'chalk'

export const styles = {
  titleHeader: chalk.bold.blueBright.inverse,
  sectionHeader: chalk.italic.bold.blueBright,
  success: chalk.greenBright,
  warning: chalk.yellowBright,
  error: chalk.redBright,
  info: chalk.bold.blue,
  breaking: chalk.bgRedBright.white.bold,
  neutral: chalk.dim,
  generic: chalk.bold.dim,
  link: chalk.underline.cyan,
  separator: chalk.gray('='.repeat(40)),
  debug: chalk.bold.gray,
  evaluatingState: chalk.bold.green,
  skippingState: chalk.bold.yellow,
  stateMessage: chalk.overline.hex('#b4b4b4'),
  evaluating: chalk.green,
  skipping: chalk.yellow,
  stateData: chalk.bold.gray,
  excluding: chalk.bgYellowBright.black,
  fallback: chalk.bgCyanBright.black,
  columnHeader: chalk.bold.blueBright,
  current: chalk.yellow,
  latest: chalk.bold.greenBright,
  value: chalk.bold,
  patch: chalk.green,
  minor: chalk.yellow.italic,
  major: chalk.red.bold.italic,
}

export const mainTitleOptions = {
  title: 'Stitching Your Changelog Chaos into Seamless Updates.',
  titleAlignment: 'center',
  float: 'center',
  padding: 1,
  margin: 1,
  borderStyle: 'double',
  borderColor: 'blue',
  backgroundColor: 'black',
}

export const packageReportOptions = (packageName) => ({
  title: packageName,
  titleAlignment: 'center',
  padding: 1,
  margin: 1,
  borderStyle: 'doubleSingle',
  borderColor: '#54A8AB',
  backgroundColor: 'black',
})

export const formatSeparator = (length = 40, symbol = '=', color = chalk.gray) => {
  return color(symbol.repeat(length))
}

export const styledMessage = (level, message, style) => {
  return `${style(level)} ${message}`
}

export const formatBulletList = (items, color = chalk.white) => {
  return items
    .map((item, idx) => `${chalk.gray((idx + 1).toString())}. ${color(item)}`)
    .join('\n')
}
