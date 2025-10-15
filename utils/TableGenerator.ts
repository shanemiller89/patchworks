import { getBorderCharacters, table } from 'table'
import { styles } from '../reports/styles.js'

export interface TableCell {
  value: any
  type?: 'string' | 'boolean' | 'semantic'
}

export interface TableOptions {
  fullWidth?: boolean
  title?: string
  columnConfig?: (baseWidth: number, terminalWidth: number) => Record<number, any>
}

export interface FormatOptions {
  type?: 'string' | 'boolean' | 'semantic'
}

/**
 * Class representing a table generator.
 */
export class TableGenerator {
  private headers: string[]
  private data: TableCell[][]
  private options: TableOptions

  /**
   * Create a table generator.
   * @param headers - The headers for the table.
   * @param data - The data for the table rows.
   * @param options - Configuration options for the table.
   */
  constructor(headers: string[], data: TableCell[][], options: TableOptions = {}) {
    this.headers = headers
    this.data = data
    this.options = options
  }

  /**
   * Get the formatted value for a table cell.
   * @param value - The value to format.
   * @param options - Options for formatting.
   * @returns The formatted value.
   */
  getValue(value: any, options: FormatOptions = { type: 'string' }): string {
    if (options.type === 'boolean') {
      return value === true ? styles.success('✓') : styles.error('✗')
    }
    if (options.type === 'semantic') {
      const styleFunction = styles[value as keyof typeof styles]
      return typeof styleFunction === 'function' ? styleFunction(value) : value
    }
    return value === undefined || value === null ? styles.neutral('-') : value
  }

  /**
   * Generate the table as a string.
   * @returns The generated table.
   */
  generateTable(): string {
    const headerRow = this.headers.map((h) => styles.columnHeader(h))
    const rows = this.data.map((row) =>
      row.map((cell) =>
        this.getValue(cell.value, { type: cell.type || 'string' }),
      ),
    )

    const terminalWidth = process.stdout.columns || 80
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
