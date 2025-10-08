import inquirer from 'inquirer'
import chalk from 'chalk'

export interface AISetupConfig {
  enabled: boolean
  anthropicApiKey?: string
  openaiApiKey?: string
  geminiApiKey?: string
  focusAreas: ('breaking' | 'security' | 'deprecation' | 'performance' | 'migration')[]
  provider: 'auto' | 'anthropic' | 'openai' | 'gemini'
}

/**
 * Interactive AI setup wizard that guides users through AI configuration
 * with clear security messaging and skip options
 */
export async function promptAISetup(): Promise<AISetupConfig> {
  // Display introduction and security message
  console.log('\n' + chalk.bold.cyan('🤖 AI Critical Findings Setup'))
  console.log(chalk.cyan('━'.repeat(80)))
  console.log()
  console.log('AI-powered analysis identifies breaking changes, security issues,')
  console.log('and migration steps across all your dependency updates.')
  console.log()
  console.log(chalk.bold.yellow('🔒 Security Note:'))
  console.log(chalk.yellow('   • API keys are stored ONLY in your local config file'))
  console.log(chalk.yellow('   • Keys are NEVER logged or sent anywhere except AI providers'))
  console.log(chalk.yellow('   • Add patchworks-config.json to .gitignore'))
  console.log(chalk.yellow('   • You can skip key setup and add them later'))
  console.log()
  console.log(chalk.cyan('━'.repeat(80)))
  console.log()

  // Step 1: Ask if user wants to enable AI
  const { enableAI } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'enableAI',
      message: 'Enable AI-powered critical findings analysis?',
      default: false,
    },
  ])

  if (!enableAI) {
    console.log(chalk.gray('\n✓ AI analysis disabled. You can enable it later in the config file.'))
    return {
      enabled: false,
      focusAreas: ['breaking', 'security', 'migration'],
      provider: 'auto',
    }
  }

  // Step 2: Provider selection
  const { providerChoice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'providerChoice',
      message: 'Which AI provider would you like to use?',
      choices: [
        {
          name: 'Auto (tries all providers with fallback) - Recommended',
          value: 'auto',
        },
        {
          name: 'Anthropic Claude only',
          value: 'anthropic',
        },
        {
          name: 'OpenAI GPT-4 only',
          value: 'openai',
        },
        {
          name: 'Google Gemini only',
          value: 'gemini',
        },
        {
          name: 'Skip for now (configure manually later)',
          value: 'skip',
        },
      ],
      default: 'auto',
    },
  ])

  let anthropicApiKey: string | undefined
  let openaiApiKey: string | undefined
  let geminiApiKey: string | undefined

  // Step 3: API Key Entry (if not skipped)
  if (providerChoice !== 'skip') {
    // Anthropic key (if auto or anthropic selected)
    if (providerChoice === 'auto' || providerChoice === 'anthropic') {
      console.log()
      console.log(chalk.dim('Get your Anthropic API key at: https://console.anthropic.com/'))
      console.log(chalk.dim('Format: sk-ant-...'))
      console.log()

      const { anthropicKey } = await inquirer.prompt([
        {
          type: 'password',
          name: 'anthropicKey',
          message: 'Enter your Anthropic API key (or press Enter to skip):',
          mask: '*',
        },
      ])

      if (anthropicKey && anthropicKey.trim()) {
        anthropicApiKey = anthropicKey.trim()
        console.log(chalk.green('✓ Anthropic API key configured'))
      } else {
        console.log(chalk.gray('  Skipped - you can add this later'))
      }
    }

    // OpenAI key (if auto or openai selected)
    if (providerChoice === 'auto' || providerChoice === 'openai') {
      console.log()
      console.log(chalk.dim('Get your OpenAI API key at: https://platform.openai.com/'))
      console.log(chalk.dim('Format: sk-proj-... or sk-...'))
      console.log()

      const { openaiKey } = await inquirer.prompt([
        {
          type: 'password',
          name: 'openaiKey',
          message: 'Enter your OpenAI API key (or press Enter to skip):',
          mask: '*',
        },
      ])

      if (openaiKey && openaiKey.trim()) {
        openaiApiKey = openaiKey.trim()
        console.log(chalk.green('✓ OpenAI API key configured'))
      } else {
        console.log(chalk.gray('  Skipped - you can add this later'))
      }
    }

    // Gemini key (if auto or gemini selected)
    if (providerChoice === 'auto' || providerChoice === 'gemini') {
      console.log()
      console.log(chalk.dim('Get your Gemini API key at: https://aistudio.google.com/app/apikey'))
      console.log(chalk.dim('Format: AIza...'))
      console.log()

      const { geminiKey } = await inquirer.prompt([
        {
          type: 'password',
          name: 'geminiKey',
          message: 'Enter your Gemini API key (or press Enter to skip):',
          mask: '*',
        },
      ])

      if (geminiKey && geminiKey.trim()) {
        geminiApiKey = geminiKey.trim()
        console.log(chalk.green('✓ Gemini API key configured'))
      } else {
        console.log(chalk.gray('  Skipped - you can add this later'))
      }
    }
  }

  // Step 4: Focus Areas
  console.log()
  const { focusAreas } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'focusAreas',
      message: 'What should AI focus on? (Space to select, Enter to confirm)',
      choices: [
        { name: 'Breaking changes', value: 'breaking', checked: true },
        { name: 'Security issues', value: 'security', checked: true },
        { name: 'Migration steps', value: 'migration', checked: true },
        { name: 'Deprecations', value: 'deprecation', checked: false },
        { name: 'Performance', value: 'performance', checked: false },
      ],
      validate: (answer) => {
        if (answer.length === 0) {
          return 'You must select at least one focus area.'
        }
        return true
      },
    },
  ])

  // Step 5: Confirmation Summary
  console.log()
  console.log(chalk.bold.green('✓ AI Configuration Summary:'))
  console.log(chalk.green(`  • Status: Enabled`))
  
  const providerName = 
    providerChoice === 'auto' ? 'Auto (tries all with fallback)' :
    providerChoice === 'anthropic' ? 'Anthropic Claude only' :
    providerChoice === 'openai' ? 'OpenAI GPT-4 only' :
    providerChoice === 'gemini' ? 'Google Gemini only' :
    'Not configured (manual setup required)'
  
  console.log(chalk.green(`  • Provider: ${providerName}`))
  console.log(chalk.green(`  • Anthropic Key: ${anthropicApiKey ? 'Configured ✓' : 'Not configured'}`))
  console.log(chalk.green(`  • OpenAI Key: ${openaiApiKey ? 'Configured ✓' : 'Not configured'}`))
  console.log(chalk.green(`  • Gemini Key: ${geminiApiKey ? 'Configured ✓' : 'Not configured'}`))
  console.log(chalk.green(`  • Focus: ${focusAreas.join(', ')}`))
  console.log()

  if (!anthropicApiKey && !openaiApiKey && !geminiApiKey && providerChoice !== 'skip') {
    console.log(chalk.yellow('⚠️  Warning: No API keys configured. AI analysis will fail until you add keys.'))
    console.log(chalk.yellow('   You can add them manually to patchworks-config.json later.'))
    console.log()
  }

  const { confirmSave } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmSave',
      message: 'Save this configuration?',
      default: true,
    },
  ])

  if (!confirmSave) {
    console.log(chalk.red('\n✗ Configuration cancelled.'))
    process.exit(0)
  }

  return {
    enabled: true,
    anthropicApiKey,
    openaiApiKey,
    geminiApiKey,
    focusAreas: focusAreas as AISetupConfig['focusAreas'],
    provider: providerChoice === 'skip' ? 'auto' : (providerChoice as 'auto' | 'anthropic' | 'openai' | 'gemini'),
  }
}
