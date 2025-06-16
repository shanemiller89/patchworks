import { Command } from 'commander';
import chalk from 'chalk';
import { version, description } from '../../package.json';

import updateCommand from './commands/update.js';
import reportsCommand from './commands/reports.js';
import menuCommand from './commands/menu.js';

export default function () {
  const program = new Command();

  program
    .name('patchworks')
    .description(description)
    .version(version, '-v, --version', 'Display version number')
    .helpOption('-h, --help', 'Display help information');

  program
    .command('update <level>')
    .description('Run the main update program with options')
    .option('--limit <number>', 'Limit the number of packages to update', parseInt)
    .option('--level-scope <scope>', 'Scope for the update level')
    .option('--summary', 'Show summary only')
    .option('--skipped', 'Show skipped packages')
    .option('--install', 'Install updates automatically')
    .option('--exclude-repoless', 'Exclude packages without repository info')
    .option('--show-excluded', 'Show excluded packages')
    .action(updateCommand);

  program
    .command('reports <level>')
    .description('Generate reports based on the current state of dependencies')
    .option('--limit <number>', 'Limit the number of packages in report', parseInt)
    .option('--level-scope <scope>', 'Scope for the report level')
    .option('--summary', 'Generate summary report')
    .option('--skipped', 'Include skipped packages in report')
    .option('--exclude-repoless', 'Exclude packages without repository info')
    .option('--show-excluded', 'Show excluded packages in report')
    .action(reportsCommand);

  program
    .command('menu [level]')
    .description('Display the main menu for navigating the tool')
    .option('--limit <number>', 'Limit the number of packages', parseInt)
    .option('--level-scope <scope>', 'Scope for the menu level')
    .option('--summary', 'Show summary in menu')
    .option('--skipped', 'Show skipped packages in menu')
    .option('--install', 'Enable install option in menu')
    .option('--exclude-repoless', 'Exclude packages without repository info')
    .option('--show-excluded', 'Show excluded packages in menu')
    .action(menuCommand);

  program.on('command:*', () => {
    console.error(chalk.red('Invalid command: %s'), program.args.join(' '));
    console.log('See --help for a list of available commands.');
    process.exit(1);
  });

  program.parse(process.argv);

  if (!process.argv.slice(2).length) {
    program.outputHelp();
  }
}
