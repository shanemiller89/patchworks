#!/usr/bin/env node

/**
 * Patchworks CLI
 * Entry point for the command line interface
 */

import semver from 'semver'
import cli from '../src/cli/index.js'

const currentNodeVersion: string = process.versions.node
if (!semver.gte(currentNodeVersion, '14.0.0')) {
  console.error(
    `Patchworks requires Node.js 14.0.0 or higher. You are running ${currentNodeVersion}.`,
  )
  process.exit(1)
}

process.on('unhandledRejection', (err: Error | any) => {
  console.error('Unhandled promise rejection:', err)
  process.exit(1)
})

cli()
