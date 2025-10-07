import chalk from 'chalk';
export const styles = {
    titleHeader: chalk.bold.blueBright.inverse, // Formerly 'headers'
    sectionHeader: chalk.italic.bold.blueBright, // Formerly 'subheaders'
    success: chalk.greenBright,
    warning: chalk.yellowBright,
    error: chalk.redBright,
    info: chalk.bold.blue,
    breaking: chalk.bgRedBright.white.bold,
    neutral: chalk.dim,
    generic: chalk.bold.dim,
    link: chalk.underline.cyan,
    separator: chalk.gray('='.repeat(40)),
    // ---
    debug: chalk.bold.gray,
    evaluatingState: chalk.bold.green,
    skippingState: chalk.bold.yellow,
    stateMessage: chalk.overline.hex('#b4b4b4'),
    evaluating: chalk.green,
    skipping: chalk.yellow,
    stateData: chalk.bold.gray,
    excluding: chalk.bgYellowBright.black, // Skipping packages
    fallback: chalk.bgCyanBright.black, // Fallbacks
    //--
    columnHeader: chalk.bold.blueBright,
    // --
    current: chalk.yellow,
    latest: chalk.bold.greenBright,
    value: chalk.bold,
    patch: chalk.green,
    minor: chalk.yellow.italic,
    major: chalk.red.bold.italic,
};
/**
 * Dynamically formats a separator line with a given length and symbol.
 * @param length - Length of the separator line.
 * @param symbol - The symbol to repeat for the separator.
 * @param color - Chalk color function.
 * @returns Formatted separator line.
 */
export function formatSeparator(length = 40, symbol = '=', color = chalk.gray) {
    return color(symbol.repeat(length));
}
/**
 * Formats a message with a specific log level and style.
 * @param level - The log level (e.g., [INFO], [ERROR]).
 * @param message - The message to style.
 * @param style - Chalk style function.
 * @returns Styled message string.
 */
export function styledMessage(level, message, style) {
    return `${style(level)} ${message}`;
}
/**
 * Formats a bullet list of items with a specified color.
 * @param items - List of items to format.
 * @param color - Chalk color function for item text.
 * @returns Formatted bullet list.
 */
export function formatBulletList(items, color = chalk.white) {
    return items
        .map((item, idx) => `${chalk.gray((idx + 1).toString())}. ${color(item)}`)
        .join('\n');
}
export const mainTitleOptions = {
    title: 'Stitching Your Changelog Chaos into Seamless Updates.',
    titleAlignment: 'center',
    float: 'center',
    // fullscreen: (width, height) => [width, height - 1],
    padding: 1, // Space inside the box
    margin: 1, // Space outside the box
    borderStyle: 'double', // Border style ('single', 'double', etc.)
    borderColor: 'blue', // Border color ('red', 'green', 'blue', etc.)
    backgroundColor: 'black', // Background color inside the box
};
export const packageReportOptions = (packageName) => ({
    title: packageName,
    titleAlignment: 'center',
    padding: 1, // Space inside the box
    margin: 1, // Space outside the box
    borderStyle: 'doubleSingle', // Border style ('single', 'double', etc.)
    borderColor: '#54A8AB', // Border color ('red', 'green', 'blue', etc.)
    backgroundColor: 'black', // Background color inside the box
});
