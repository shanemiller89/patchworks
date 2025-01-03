import chalk from 'chalk'

export const styles = {
  headers: chalk.bold.underline.blue,
  subheaders: chalk.cyanBright,
  success: chalk.greenBright,
  warning: chalk.yellowBright,
  error: chalk.redBright,
  breaking: chalk.bgRedBright.white.bold,
  neutral: chalk.gray,
  link: chalk.underline.cyan,
  separator: chalk.gray('='.repeat(40)),
}

export function formatBulletList(items, color = chalk.white) {
  return items
    .map((item, idx) => `${chalk.gray(idx + 1)}. ${color(item)}`)
    .join('\n')
}
