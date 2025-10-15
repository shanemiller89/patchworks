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
  ai?: {
    enabled: boolean
    anthropicApiKey?: string
    openaiApiKey?: string
    geminiApiKey?: string
    focusAreas?: ('breaking' | 'security' | 'deprecation' | 'performance' | 'migration')[]
    provider?: 'anthropic' | 'openai' | 'gemini' | 'auto'
    anthropicModel?: string  // Claude model (e.g., claude-3-5-sonnet-20241022)
    openaiModel?: string     // OpenAI model (e.g., gpt-4o, gpt-4)
    geminiModel?: string     // Gemini model (e.g., gemini-1.5-pro, gemini-1.5-flash)
  }
}

export interface AIConfigInput {
  enabled: boolean
  anthropicApiKey?: string
  openaiApiKey?: string
  geminiApiKey?: string
  focusAreas: string[]
  provider: string
}

export async function generateConfig(aiConfig?: AIConfigInput): Promise<void> {
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
    ai: aiConfig ? {
      enabled: aiConfig.enabled,
      focusAreas: aiConfig.focusAreas as ('breaking' | 'security' | 'deprecation' | 'performance' | 'migration')[],
      provider: aiConfig.provider as 'auto' | 'anthropic' | 'openai' | 'gemini',
      anthropicModel: 'claude-3-5-sonnet-20241022', // Claude model
      openaiModel: 'gpt-4o', // OpenAI model
      geminiModel: 'gemini-2.0-flash-001', // Gemini model (2.0 Flash is faster and better)
      ...(aiConfig.anthropicApiKey && { anthropicApiKey: aiConfig.anthropicApiKey }),
      ...(aiConfig.openaiApiKey && { openaiApiKey: aiConfig.openaiApiKey }),
      ...(aiConfig.geminiApiKey && { geminiApiKey: aiConfig.geminiApiKey }),
    } : {
      enabled: false, // Enable AI-powered critical findings analysis (default: false)
      focusAreas: ['breaking', 'security', 'migration'], // Focus areas for AI analysis
      provider: 'auto', // AI provider: 'anthropic', 'openai', 'gemini', or 'auto' for fallback
      anthropicModel: 'claude-3-5-sonnet-20241022', // Claude model to use
      openaiModel: 'gpt-4o', // OpenAI model to use (gpt-4o, gpt-4, etc.)
      geminiModel: 'gemini-2.0-flash-001', // Gemini model to use (gemini-2.0-flash-001, gemini-2.5-flash, etc.)
      // Add your API keys here:
      // anthropicApiKey: 'sk-ant-...',
      // openaiApiKey: 'sk-...',
      // geminiApiKey: '...',
    },
  }

  const outputPath = path.resolve(process.cwd(), 'patchworks-config.json')

  try {
    // Create JSON with helpful comments for security
    let jsonString = JSON.stringify(config, null, 2)
    
    // Add security notes as comments after the AI section
    if (config.ai) {
      const aiSectionEnd = jsonString.lastIndexOf('}', jsonString.lastIndexOf('}') - 1)
      const securityComment = `

    // 🔒 SECURITY NOTES:
    // • API keys are stored ONLY in this local file
    // • Keys are NEVER logged, displayed, or sent anywhere except AI providers  
    // • Add this file to .gitignore to prevent accidental commits
    // • Get keys from:
    //   - Anthropic: https://console.anthropic.com/
    //   - OpenAI: https://platform.openai.com/
    
    // Uncomment and add your API keys:
    // "anthropicApiKey": "sk-ant-...",
    // "openaiApiKey": "sk-..."`
      
      // Only add comments if keys weren't configured
      if (!config.ai.anthropicApiKey && !config.ai.openaiApiKey) {
        jsonString = jsonString.slice(0, aiSectionEnd) + securityComment + '\n  ' + jsonString.slice(aiSectionEnd)
      }
    }
    
    await fs.promises.writeFile(outputPath, jsonString)
    // Note: Using console.log here is intentional for config generation output
    console.log(`Configuration saved to ${outputPath}`)
  } catch (error) {
    console.error(`Failed to write configuration: ${(error as Error).message}`)
  }
}

export async function readConfig(): Promise<PatchworksConfig | null> {
  const configPath = path.resolve(process.cwd(), 'patchworks-config.json')

  try {
    const configFile = await fs.promises.readFile(configPath, 'utf-8')
    return JSON.parse(configFile) as PatchworksConfig
  } catch (error) {
    // Only log if it's not a "file not found" error
    // Note: Using console.error here is intentional for config reading errors
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error(`Failed to read configuration: ${(error as Error).message}`)
    }
    // Return null if config doesn't exist or can't be read
    // Callers should handle null appropriately
    return null
  }
}
