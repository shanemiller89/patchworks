import fs from 'fs'
import path from 'path'

export interface PatchworksConfig {
  level: 'patch' | 'minor' | 'major'
  install: boolean
  limit: number | null
  levelScope: 'strict' | 'cascade'
  summary: boolean
  skipped: boolean
  write: boolean
  excludeRepoless: boolean
  debug: boolean
  showExcluded: boolean
}

export async function generateConfig(): Promise<void> {
  const config: PatchworksConfig = {
    // Configuration for Patchworks
    level: 'minor', // Set the default update level
    install: true, // Enable automatic installation of dependencies
    limit: null, // Limit the number of updates processed (default: no limit)
    levelScope: 'strict', // Control semantic version filtering (default: 'strict')
    summary: false, // Generate a summary report (default: false)
    skipped: false, // Show skipped packages in the output (default: false)
    write: false, // Write changes to a file or make them persistent (default: false)
    excludeRepoless: false, // Exclude packages without repositories (default: false)
    debug: false, // Show verbose debug consoles (default: false)
    showExcluded: false, // Show excluded packages in the console output (default: false)
  }

  const outputPath = path.resolve(process.cwd(), 'patchworks-config.json')

  try {
    fs.writeFileSync(outputPath, JSON.stringify(config, null, 2))
    console.log(`Configuration saved to ${outputPath}`)
  } catch (error) {
    console.error(`Failed to write configuration: ${(error as Error).message}`)
  }
}

export async function readConfig(): Promise<PatchworksConfig | null> {
  const configPath = path.resolve(process.cwd(), 'patchworks-config.json')

  try {
    const configFile = fs.readFileSync(configPath, 'utf-8')
    return JSON.parse(configFile) as PatchworksConfig
  } catch (error) {
    console.error(`Failed to read configuration: ${(error as Error).message}`)
    return null // Return null if the config cannot be read
  }
}
