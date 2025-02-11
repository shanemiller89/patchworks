import { getBorderCharacters, table } from 'table'
import { styles } from '../reports/styles.js'

/**
 * Class representing a table generator.
 */
export class TableGenerator {
  /**
   * Create a table generator.
   * @param {Array<string>} headers - The headers for the table.
   * @param {Array<Array<any>>} data - The data for the table rows.
   * @param {Object} [options={}] - Configuration options for the table.
   * @param {boolean} [options.fullWidth=false] - Whether to use the full terminal width.
   * @param {string} [options.title='Table'] - The title of the table.
   * @param {Function} [options.columnConfig] - Function to generate custom column configuration.
   */
  constructor(headers, data, options = {}) {
    this.headers = headers
    this.data = data
    this.options = options
  }

  /**
   * Get the formatted value for a table cell.
   * @param {any} value - The value to format.
   * @param {Object} [options={}] - Options for formatting.
   * @param {string} [options.type='string'] - The type of the value ('string' or 'boolean').
   * @returns {string} The formatted value.
   */
  getValue(value, options = { type: 'string' }) {
    if (options.type === 'boolean') {
      return value === true ? styles.success('✓') : styles.error('✗')
    }
    if (options.type === 'semantic') {
      return styles[value](value)
    }
    return value === undefined || value === null ? styles.neutral('-') : value
  }

  /**
   * Generate the table as a string.
   * @returns {string} The generated table.
   */
  generateTable() {
    const headerRow = this.headers.map((h) => styles.columnHeader(h))
    const rows = this.data.map((row) =>
      row.map((cell) =>
        this.getValue(cell.value, { type: cell.type || 'string' }),
      ),
    )

    const terminalWidth = process.stdout.columns
    const totalColumns = this.headers.length
    const baseWidth = Math.floor(terminalWidth / totalColumns)

    const config = {
      header: {
        content: styles.value(this.options.title || 'Table'),
      },
      columnDefault: {
        width: 10,
        wrapWord: true,
      },
      columns: this.options.columnConfig
        ? this.options.columnConfig(baseWidth, terminalWidth)
        : {},
      border: getBorderCharacters('honeywell'),
    }

    return table([headerRow, ...rows], config)
  }
}

// export function displayIncludedPackages(includedPackages) {
//   return new Promise((resolve) => {
//     const terminalWidth = process.stdout.columns
//     const columnHeaders = [
//       styles.columnHeader('Package'),
//       styles.columnHeader('Current'),
//       styles.columnHeader('Wanted'),
//       styles.columnHeader('Latest'),
//       styles.columnHeader('Update Type'),
//       styles.columnHeader('Update Difficulty'),
//       styles.columnHeader('GitHub URL'),
//       styles.columnHeader('RN Compatible'),
//       styles.columnHeader('FB A Compatible'),
//       styles.columnHeader('FB B Compatible'),
//       styles.columnHeader('Homepage'),
//     ]

//     const rows = includedPackages.map((pkg) => [
//       getValue(pkg.packageName),
//       getValue(pkg.metadata.current),
//       getValue(pkg.metadata.wanted),
//       getValue(pkg.metadata.latest),
//       getValue(pkg.metadata.updateType),
//       getValue(pkg.metadata.updatingDifficulty),
//       getValue(pkg.metadata.githubUrl),
//       getValue(
//         !![false, 'UNKNOWN', 'SKIPPED'].includes(
//           pkg.metadata.releaseNotesCompatible,
//         ),
//         { type: 'boolean' },
//       ),
//       getValue(
//         !![false, 'UNKNOWN', 'SKIPPED'].includes(
//           pkg.metadata.fallbackACompatible,
//         ),
//         { type: 'boolean' },
//       ),
//       getValue(
//         !![false, 'UNKNOWN', 'SKIPPED'].includes(
//           pkg.metadata.fallbackBCompatible,
//         ),
//         { type: 'boolean' },
//       ),
//       getValue(pkg.metadata.homepage),
//     ])

//     const totalColumns = columnHeaders.length
//     const baseWidth = Math.floor(terminalWidth / totalColumns)

//     const config = {
//       header: {
//         content: styles.value('Included Packages'),
//       },
//       columnDefault: {
//         width: 10,
//         wrapWord: true,
//       },
//       columns: {
//         0: { width: 20 },
//         6: { width: Math.min(baseWidth * 2, terminalWidth / 3) }, // Adjust 'GitHub URL' column
//         10: { width: Math.min(baseWidth * 2, terminalWidth / 3) }, // Adjust 'Homepage' column
//       },
//       border: getBorderCharacters('honeywell'),
//     }

//     const output = table([columnHeaders, ...rows], config)
//     resolve(output)
//   })
// }
