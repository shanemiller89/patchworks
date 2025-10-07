import type { Command } from 'commander'
import logger from '../../reports/logger.js'

export type OutputWriter = (str: string) => void

export function createOutputErrorHandler(program: Pick<Command, 'help'>) {
  return (str: string, write: OutputWriter) => {
    write('')
    logger.error(str.trim())
    program.help()
  }
}
