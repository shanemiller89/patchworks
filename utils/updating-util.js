import logger from '../reports/logger.js'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

/**
 * Updates the `package.json` file with new dependency versions.
 * @param {Object} filteredPackages - The packages with updated versions.
 */
export function writeChanges(filteredPackages) {
  const packageJsonPath = path.resolve('package.json')
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))

  Object.entries(filteredPackages).forEach(([pkg, details]) => {
    packageJson.dependencies[pkg] = `^${details.version}`
  })

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))
  logger.success('package.json updated with new versions.')
}

/**
 * Installs updated dependencies using npm.
 */
export function installDependencies() {
  logger.info('Installing updated dependencies...')
  try {
    execSync('npm install', { stdio: 'inherit' })
    logger.success('Dependencies installed successfully.')
  } catch (error) {
    logger.error(`Failed to install dependencies: ${error.message}`)
  }
}
