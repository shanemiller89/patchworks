import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { GoogleGenAI } from '@google/genai'
import logger from '../reports/logger.js'
import { AICriticalFindings, PackageWithLogs } from '../types/index.js'
import { PatchworksConfig } from '../config/configUtil.js'

/**
 * Masks an API key for safe display
 * @param key - API key to mask
 * @param provider - Provider name for formatting
 * @returns Masked key string
 */
function maskApiKey(key: string, provider: string): string {
  if (!key || key.length < 10) {
    return `[${provider}: invalid key format]`
  }
  
  // Show first 7 chars and last 4 chars, mask the middle
  const prefix = key.substring(0, 7)
  const suffix = key.substring(key.length - 4)
  const maskedLength = key.length - 11
  const masked = '*'.repeat(Math.min(maskedLength, 20))
  
  return `${prefix}${masked}${suffix}`
}

/**
 * Validates that at least one API key is present in config
 * @param aiConfig - AI configuration object
 * @returns True if valid, throws error otherwise
 */
export function validateApiKeys(
  aiConfig: PatchworksConfig['ai'],
): { hasAnthropic: boolean; hasOpenAI: boolean; hasGemini: boolean } {
  if (!aiConfig?.anthropicApiKey && !aiConfig?.openaiApiKey && !aiConfig?.geminiApiKey) {
    throw new Error(
      'AI analysis requires at least one API key. ' +
        'Add "anthropicApiKey", "openaiApiKey", or "geminiApiKey" to your patchworks-config.json file.',
    )
  }

  const hasAnthropic = !!aiConfig.anthropicApiKey
  const hasOpenAI = !!aiConfig.openaiApiKey
  const hasGemini = !!aiConfig.geminiApiKey

  // Log masked keys for verification
  logger.debug('🔑 API Key Status:')
  if (hasAnthropic) {
    logger.debug(`  ✓ Anthropic: ${maskApiKey(aiConfig.anthropicApiKey!, 'Anthropic')}`)
  } else {
    logger.debug('  ✗ Anthropic: Not configured')
  }
  
  if (hasOpenAI) {
    logger.debug(`  ✓ OpenAI: ${maskApiKey(aiConfig.openaiApiKey!, 'OpenAI')}`)
  } else {
    logger.debug('  ✗ OpenAI: Not configured')
  }
  
  if (hasGemini) {
    logger.debug(`  ✓ Gemini: ${maskApiKey(aiConfig.geminiApiKey!, 'Gemini')}`)
  } else {
    logger.debug('  ✗ Gemini: Not configured')
  }

  return {
    hasAnthropic,
    hasOpenAI,
    hasGemini,
  }
}

/**
 * Formats package data for AI consumption
 * @param packages - Array of packages with logs
 * @returns Formatted string for AI prompt
 */
export function formatPackagesForAI(packages: PackageWithLogs[]): string {
  return packages
    .map((pkg) => {
      const { packageName, metadata, releaseNotes, changelog, categorizedNotes, source } = pkg

      let output = `\n## ${packageName}\n`
      output += `- Current Version: ${metadata.current}\n`
      output += `- Latest Version: ${metadata.latest}\n`
      output += `- Update Type: ${metadata.updateType}\n`
      if (source) {
        output += `- Data Source: ${source}\n`
      }

      // Add categorized notes if available (for quick reference)
      if (categorizedNotes && categorizedNotes.length > 0) {
        output += '\n### Pre-Categorized Summary (for reference):\n'
        categorizedNotes.forEach((versionNotes) => {
          output += `\n#### Version ${versionNotes.version}\n`
          const { categorized } = versionNotes

          if (categorized.breaking && categorized.breaking.length > 0) {
            output += `\n**Breaking Changes:**\n`
            categorized.breaking.forEach((item) => {
              output += `- ${item}\n`
            })
          }

          if (categorized.security && categorized.security.length > 0) {
            output += `\n**Security:**\n`
            categorized.security.forEach((item) => {
              output += `- ${item}\n`
            })
          }

          if (categorized.deprecation && categorized.deprecation.length > 0) {
            output += `\n**Deprecations:**\n`
            categorized.deprecation.forEach((item) => {
              output += `- ${item}\n`
            })
          }

          if (categorized.features && categorized.features.length > 0) {
            output += `\n**Features:**\n`
            categorized.features.slice(0, 5).forEach((item) => {
              output += `- ${item}\n`
            })
          }

          if (categorized.bugFixes && categorized.bugFixes.length > 0) {
            output += `\n**Bug Fixes:**\n`
            categorized.bugFixes.slice(0, 5).forEach((item) => {
              output += `- ${item}\n`
            })
          }
        })
      }

      // Always include raw release notes for complete context
      let hasRawContent = false;
      
      // Handle releaseNotes (can be string, array, or object)
      if (releaseNotes) {
        if (typeof releaseNotes === 'string' && releaseNotes.trim()) {
          output += `\n### Raw Release Notes (Complete Source):\n`
          output += '```\n'
          output += releaseNotes.slice(0, 5000)
          if (releaseNotes.length > 5000) {
            output += '\n... (truncated for length)'
          }
          output += '\n```\n'
          hasRawContent = true;
        } else if (Array.isArray(releaseNotes) && releaseNotes.length > 0) {
          output += `\n### Raw Release Notes (Complete Source):\n`
          releaseNotes.forEach((note: any) => {
            if (note.version) {
              output += `\n#### Version ${note.version}\n`
              if (note.published_at) {
                output += `*Published: ${note.published_at}*\n\n`
              }
            }
            const noteContent = note.notes || note.body || note.content || JSON.stringify(note);
            if (noteContent && typeof noteContent === 'string') {
              output += '```\n'
              output += noteContent.slice(0, 5000)
              if (noteContent.length > 5000) {
                output += '\n... (truncated for length)'
              }
              output += '\n```\n'
            }
          })
          hasRawContent = true;
        } else if (typeof releaseNotes === 'object') {
          const noteStr = JSON.stringify(releaseNotes, null, 2);
          if (noteStr && noteStr !== '{}' && noteStr !== '[]') {
            output += `\n### Raw Release Notes (Complete Source):\n`
            output += '```json\n'
            output += noteStr.slice(0, 5000)
            if (noteStr.length > 5000) {
              output += '\n... (truncated for length)'
            }
            output += '\n```\n'
            hasRawContent = true;
          }
        }
      }
      
      // Handle changelog as fallback
      if (!hasRawContent && changelog) {
        if (typeof changelog === 'string' && changelog.trim()) {
          output += `\n### Raw Changelog (Complete Source):\n`
          output += '```\n'
          output += changelog.slice(0, 5000)
          if (changelog.length > 5000) {
            output += '\n... (truncated for length)'
          }
          output += '\n```\n'
          hasRawContent = true;
        } else if (Array.isArray(changelog) && changelog.length > 0) {
          output += `\n### Raw Changelog (Complete Source):\n`
          changelog.forEach((entry: any) => {
            const entryStr = typeof entry === 'string' ? entry : JSON.stringify(entry, null, 2);
            if (entryStr) {
              output += '```\n'
              output += entryStr.slice(0, 3000)
              if (entryStr.length > 3000) {
                output += '\n... (truncated)'
              }
              output += '\n```\n'
            }
          })
          hasRawContent = true;
        } else if (typeof changelog === 'object') {
          const changeStr = JSON.stringify(changelog, null, 2);
          if (changeStr && changeStr !== '{}' && changeStr !== '[]') {
            output += `\n### Raw Changelog (Complete Source):\n`
            output += '```json\n'
            output += changeStr.slice(0, 5000)
            if (changeStr.length > 5000) {
              output += '\n... (truncated for length)'
            }
            output += '\n```\n'
            hasRawContent = true;
          }
        }
      }
      
      // Warn if no raw content available
      if (!hasRawContent) {
        output += `\n### ⚠️ No Release Notes Available\n`
        output += `Release notes could not be fetched for this package. This may be due to:\n`
        output += `- Package doesn't publish release notes\n`
        output += `- API rate limiting\n`
        output += `- Repository structure not supported\n\n`
        output += `**Recommendation**: Manually review the package's CHANGELOG or release page before updating.\n`
      }

      output += '\n---\n'
      return output
    })
    .join('\n')
}

/**
 * Creates the system and user prompts for AI analysis
 * @param packages - Formatted package data
 * @param focusAreas - Areas to focus on
 * @returns System and user prompt strings
 */
function createPrompt(
  packages: string,
  focusAreas: string[],
): { system: string; user: string } {
  const focusAreasStr = focusAreas.join(', ')

  const system = `You are a senior software engineer analyzing dependency updates for a Node.js project. Your role is to identify critical issues that require immediate attention by carefully reviewing the raw release notes and changelogs.

Focus Areas: ${focusAreasStr}

IMPORTANT INSTRUCTIONS:
1. Read the COMPLETE raw release notes/changelog for each package
2. Pre-categorized summaries are provided for reference, but ALWAYS verify against raw source
3. Look for explicit mentions of breaking changes, security patches, deprecations, and migration guides
4. Identify version-specific compatibility requirements and peer dependency changes
5. Prioritize by severity: Security > Breaking Changes > Deprecations > Features
6. Provide actionable, specific guidance with version numbers and code examples when available

Generate ONE consolidated report that helps developers understand:
- What will break and how to fix it
- Security vulnerabilities that need immediate attention
- Step-by-step migration path with order of operations
- Risk assessment for each update`

  const user = `Analyze these dependency updates and provide a critical findings summary.

PACKAGE DATA:
${packages}

Provide your analysis using the following MARKDOWN template. Use code blocks, mermaid diagrams, and rich formatting:

# 📊 Critical Findings Summary

## Executive Summary
[2-4 sentences highlighting the most critical security issues, breaking changes, and overall risk level. Be specific about which packages pose the highest risk.]

## 🚨 Breaking Changes

[List each breaking change with package@version. Include code examples where applicable.]

### package-name@version
**Impact**: [Describe the impact - High/Medium/Low]

[Detailed description of the breaking change]

\`\`\`javascript
// Before (old API)
const example = oldApi();

// After (new API)
const example = newApi();
\`\`\`

**Affected Code**: [Which parts of the codebase are affected]

---

## 🔒 Security Issues

[List security vulnerabilities with CVE numbers, severity, and remediation steps]

### package-name@version
**CVE**: CVE-XXXX-XXXXX  
**Severity**: Critical/High/Medium/Low  
**Description**: [Brief description of the vulnerability]  
**Impact**: [What could happen if not addressed]  
**Action Required**: [What needs to be done]

---

## 🛠️ Migration Steps

[Provide a numbered, step-by-step migration guide with code examples]

### Step 1: [Title] - package-name@version
[Detailed instructions]

\`\`\`bash
# Commands to run
npm install package-name@version
\`\`\`

\`\`\`javascript
// Code changes needed
import { newApi } from 'package-name';
\`\`\`

### Step 2: [Title] - package-name@version
[Continue with logical order...]

---

## 📋 Recommended Update Order

[Use a mermaid diagram to show dependency flow and update order]

\`\`\`mermaid
graph TD
    A[Step 1: package-a@version] --> B[Step 2: package-b@version]
    A --> C[Step 2: package-c@version]
    B --> D[Step 3: package-d@version]
    C --> D
    
    style A fill:#90EE90
    style B fill:#FFD700
    style C fill:#FFD700
    style D fill:#FF6B6B
    
    classDef safe fill:#90EE90,stroke:#2E7D32,stroke-width:2px
    classDef caution fill:#FFD700,stroke:#F57C00,stroke-width:2px
    classDef breaking fill:#FF6B6B,stroke:#C62828,stroke-width:2px
\`\`\`

### Detailed Order with Reasoning:

1. **package-name@version** - [Reason: e.g., "Security patch with no breaking changes - safe to update first"]
   - Risk Level: Low/Medium/High
   - Dependencies: None
   
2. **package-name@version** - [Reason: e.g., "Required peer dependency for X"]
   - Risk Level: Low/Medium/High
   - Dependencies: Requires package-a@version

---

## 💡 Additional Recommendations

[Any other important notes, deprecation warnings, or best practices]

- Consider testing in staging environment first for high-risk updates
- Review full release notes for packages with breaking changes
- [Other recommendations]

---

**Analysis Date**: [current date]  
**Total Packages Analyzed**: [count]

CRITICAL INSTRUCTIONS:
- Return ONLY the markdown content (no JSON wrapper, no extra text)
- Base analysis on RAW release notes, not just pre-categorized data
- Use code blocks for all code examples (\`\`\`javascript, \`\`\`typescript, \`\`\`bash, etc.)
- Use mermaid diagrams for dependency flows and update sequences
- Be specific and actionable - include version numbers, API names, and concrete steps
- If information is unclear from release notes, note it explicitly
- Empty sections are acceptable if no issues found in that category (use "No issues found" message)
- Use emojis for visual clarity: 🚨 (breaking), 🔒 (security), 🛠️ (migration), 📋 (order), 💡 (tips)`

  return { system, user }
}

/**
 * Parses AI response and extracts structured findings from markdown
 * @param response - Raw markdown response string
 * @param packageCount - Number of packages analyzed
 * @returns Parsed findings object
 */
function parseAIResponse(
  response: string,
  packageCount: number,
): Omit<AICriticalFindings, 'provider' | 'timestamp'> {
  try {
    // Clean up any wrapper markdown code blocks if present
    let cleaned = response.trim()
    if (cleaned.startsWith('```markdown')) {
      cleaned = cleaned.replace(/^```markdown\n?/, '').replace(/```\n?$/, '').trim()
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\n?/, '').replace(/```\n?$/, '').trim()
    }

    // Extract executive summary (text under ## Executive Summary)
    const summaryMatch = cleaned.match(/## Executive Summary\s*\n+([\s\S]*?)(?=\n##|$)/)
    const summary = summaryMatch
      ? summaryMatch[1].trim().replace(/\[|\]/g, '')
      : 'No summary provided'

    // Check for breaking changes and security issues sections
    const hasBreakingChanges = cleaned.includes('## 🚨 Breaking Changes')
    const hasSecurityIssues = cleaned.includes('## 🔒 Security Issues')

    return {
      markdownContent: cleaned,
      summary,
      hasBreakingChanges,
      hasSecurityIssues,
      packageCount,
      // Legacy fields for backwards compatibility
      breakingChanges: hasBreakingChanges ? ['See markdown report for details'] : [],
      securityIssues: hasSecurityIssues ? ['See markdown report for details'] : [],
      migrationSteps: ['See markdown report for details'],
      recommendedOrder: ['See markdown report for details'],
    }
  } catch (error) {
    logger.error(`Failed to parse AI response: ${(error as Error).message}`)
    logger.debug(`Raw response: ${response.substring(0, 500)}...`)

    // Return minimal valid response with raw content
    return {
      markdownContent: response,
      summary: 'Failed to parse AI response. See raw markdown content below.',
      hasBreakingChanges: false,
      hasSecurityIssues: false,
      packageCount,
      breakingChanges: [],
      securityIssues: [],
      migrationSteps: [],
      recommendedOrder: [],
    }
  }
}

/**
 * Analyzes packages using Anthropic Claude
 * @param packages - Array of packages with logs
 * @param aiConfig - AI configuration
 * @returns AI critical findings
 */
export async function analyzeWithClaude(
  packages: PackageWithLogs[],
  aiConfig: PatchworksConfig['ai'],
): Promise<AICriticalFindings> {
  if (!aiConfig?.anthropicApiKey) {
    throw new Error('Anthropic API key is required')
  }

  logger.debug('Analyzing with Anthropic Claude...')
  logger.debug(`Using key: ${maskApiKey(aiConfig.anthropicApiKey, 'Anthropic')}`)

  const client = new Anthropic({
    apiKey: aiConfig.anthropicApiKey,
  })

  const formattedPackages = formatPackagesForAI(packages)
  const focusAreas = aiConfig.focusAreas || ['breaking', 'security', 'migration']
  
  // Debug: Show package data structure
  logger.debug(`\n📦 Package Data Summary:`)
  packages.forEach(pkg => {
    logger.debug(`  - ${pkg.packageName}: ${pkg.metadata.current} → ${pkg.metadata.latest}`)
    logger.debug(`    • releaseNotes type: ${pkg.releaseNotes ? typeof pkg.releaseNotes : 'undefined'}`)
    logger.debug(`    • changelog type: ${pkg.changelog ? typeof pkg.changelog : 'undefined'}`)
    logger.debug(`    • source: ${pkg.source || 'unknown'}`)
  })
  
  const { system, user } = createPrompt(formattedPackages, focusAreas)

  const model = aiConfig.anthropicModel || 'claude-3-5-sonnet-20241022'
  
  logger.debug(`Using Anthropic model: ${model}`)
  
  // Log request details in debug mode
  logger.debug('\n📤 Anthropic API Request:')
  logger.debug(`  Model: ${model}`)
  logger.debug(`  Max Tokens: 4096`)
  logger.debug(`  System Prompt (${system.length} chars):`)
  logger.debug(`    ${system.substring(0, 200)}${system.length > 200 ? '...' : ''}`)
  logger.debug(`  User Prompt (${user.length} chars):`)
  logger.debug(`    ${user.substring(0, 500)}${user.length > 500 ? '...' : ''}`)

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      system,
      messages: [
        {
          role: 'user',
          content: user,
        },
      ],
    })
    
    // Log response details in debug mode
    logger.debug('\n📥 Anthropic API Response:')
    logger.debug(`  ID: ${response.id}`)
    logger.debug(`  Model: ${response.model}`)
    logger.debug(`  Stop Reason: ${response.stop_reason}`)
    logger.debug(`  Usage: ${JSON.stringify(response.usage)}`)
    
    const content = response.content[0]
    if (content.type === 'text') {
      logger.debug(`  Content (${content.text.length} chars):`)
      logger.debug(`    ${content.text.substring(0, 500)}${content.text.length > 500 ? '...' : ''}`)
    }
    logger.debug('')

    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    const parsed = parseAIResponse(content.text, packages.length)

    return {
      ...parsed,
      provider: 'anthropic',
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    const err = error as any
    logger.error(`Claude API error: ${err.message}`)
    
    // Log additional error details if available
    if (err.status) {
      logger.debug(`  HTTP Status: ${err.status}`)
    }
    if (err.code) {
      logger.debug(`  Error Code: ${err.code}`)
    }
    if (err.type) {
      logger.debug(`  Error Type: ${err.type}`)
    }
    
    throw error
  }
}

/**
 * Analyzes packages using OpenAI GPT
 * @param packages - Array of packages with logs
 * @param aiConfig - AI configuration
 * @returns AI critical findings
 */
export async function analyzeWithOpenAI(
  packages: PackageWithLogs[],
  aiConfig: PatchworksConfig['ai'],
): Promise<AICriticalFindings> {
  if (!aiConfig?.openaiApiKey) {
    throw new Error('OpenAI API key is required')
  }

  logger.debug('Analyzing with OpenAI...')
  logger.debug(`Using key: ${maskApiKey(aiConfig.openaiApiKey, 'OpenAI')}`)

  const client = new OpenAI({
    apiKey: aiConfig.openaiApiKey,
  })

  const formattedPackages = formatPackagesForAI(packages)
  const focusAreas = aiConfig.focusAreas || ['breaking', 'security', 'migration']
  const { system, user } = createPrompt(formattedPackages, focusAreas)

  const model = aiConfig.openaiModel || 'gpt-4o'
  
  logger.debug(`Using OpenAI model: ${model}`)
  
  // Log request details in debug mode
  logger.debug('\n📤 OpenAI API Request:')
  logger.debug(`  Model: ${model}`)
  logger.debug(`  Max Tokens: 4096`)
  logger.debug(`  Response Format: json_object`)
  logger.debug(`  System Message (${system.length} chars):`)
  logger.debug(`    ${system.substring(0, 200)}${system.length > 200 ? '...' : ''}`)
  logger.debug(`  User Message (${user.length} chars):`)
  logger.debug(`    ${user.substring(0, 500)}${user.length > 500 ? '...' : ''}`)

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: system,
        },
        {
          role: 'user',
          content: user,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 4096,
    })
    
    // Log response details in debug mode
    logger.debug('\n📥 OpenAI API Response:')
    logger.debug(`  ID: ${response.id}`)
    logger.debug(`  Model: ${response.model}`)
    logger.debug(`  Created: ${response.created}`)
    logger.debug(`  Finish Reason: ${response.choices[0]?.finish_reason}`)
    logger.debug(`  Usage: ${JSON.stringify(response.usage)}`)
    
    const content = response.choices[0]?.message?.content
    if (content) {
      logger.debug(`  Content (${content.length} chars):`)
      logger.debug(`    ${content.substring(0, 500)}${content.length > 500 ? '...' : ''}`)
    }
    logger.debug('')

    if (!content) {
      throw new Error('Empty response from OpenAI')
    }

    const parsed = parseAIResponse(content, packages.length)

    return {
      ...parsed,
      provider: 'openai',
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    const err = error as any
    logger.error(`OpenAI API error: ${err.message}`)
    
    // Log additional error details if available
    if (err.status) {
      logger.debug(`  HTTP Status: ${err.status}`)
    }
    if (err.code) {
      logger.debug(`  Error Code: ${err.code}`)
    }
    if (err.type) {
      logger.debug(`  Error Type: ${err.type}`)
    }
    if (err.response) {
      logger.debug(`  Response: ${JSON.stringify(err.response, null, 2)}`)
    }
    
    throw error
  }
}

/**
 * Analyzes packages using Google Gemini
 * @param packages - Array of packages with logs
 * @param aiConfig - AI configuration
 * @returns AI critical findings
 */
export async function analyzeWithGemini(
  packages: PackageWithLogs[],
  aiConfig: PatchworksConfig['ai'],
): Promise<AICriticalFindings> {
  if (!aiConfig?.geminiApiKey) {
    throw new Error('Gemini API key is required')
  }

  logger.debug('Analyzing with Google Gemini...')
  logger.debug(`Using key: ${maskApiKey(aiConfig.geminiApiKey, 'Gemini')}`)

  const ai = new GoogleGenAI({ apiKey: aiConfig.geminiApiKey })

  const formattedPackages = formatPackagesForAI(packages)
  const focusAreas = aiConfig.focusAreas || ['breaking', 'security', 'migration']
  const { system, user } = createPrompt(formattedPackages, focusAreas)

  // Use Gemini 2.0 Flash by default (faster and better than 1.5 Pro)
  const modelName = aiConfig.geminiModel || 'gemini-2.0-flash-001'
  
  logger.debug(`Using Gemini model: ${modelName}`)
  
  // Log request details in debug mode
  logger.debug('\n📤 Gemini API Request:')
  logger.debug(`  Model: ${modelName}`)
  logger.debug(`  System Instructions (${system.length} chars):`)
  logger.debug(`    ${system.substring(0, 200)}${system.length > 200 ? '...' : ''}`)
  logger.debug(`  User Prompt (${user.length} chars):`)
  logger.debug(`    ${user.substring(0, 500)}${user.length > 500 ? '...' : ''}`)

  try {
    // Combine system and user prompts for Gemini
    const fullPrompt = `${system}\n\n${user}`
    
    const response = await ai.models.generateContent({
      model: modelName,
      contents: fullPrompt,
    })
    
    // Log response details in debug mode
    logger.debug('\n📥 Gemini API Response:')
    if (response.usageMetadata) {
      logger.debug(`  Usage: ${JSON.stringify(response.usageMetadata)}`)
    }
    
    const text = response.text
    if (text) {
      logger.debug(`  Content (${text.length} chars):`)
      logger.debug(`    ${text.substring(0, 500)}${text.length > 500 ? '...' : ''}`)
    }
    logger.debug('')

    if (!text) {
      throw new Error('Empty response from Gemini')
    }

    const parsed = parseAIResponse(text, packages.length)

    return {
      ...parsed,
      provider: 'gemini',
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    const err = error as any
    logger.error(`Gemini API error: ${err.message}`)
    
    // Log additional error details if available
    if (err.status) {
      logger.debug(`  HTTP Status: ${err.status}`)
    }
    if (err.code) {
      logger.debug(`  Error Code: ${err.code}`)
    }
    if (err.statusText) {
      logger.debug(`  Status Text: ${err.statusText}`)
    }
    
    throw error
  }
}

/**
 * Main entry point for AI analysis with automatic provider fallback
 * @param packages - Array of packages with logs
 * @param aiConfig - AI configuration
 * @returns AI critical findings
 */
export async function generateCriticalFindings(
  packages: PackageWithLogs[],
  aiConfig: PatchworksConfig['ai'],
): Promise<AICriticalFindings> {
  if (!aiConfig) {
    throw new Error('AI configuration is required')
  }

  const { hasAnthropic, hasOpenAI, hasGemini } = validateApiKeys(aiConfig)

  logger.info(`Generating AI critical findings for ${packages.length} package(s)...`)

  // Determine which provider to use
  const provider = aiConfig.provider || 'auto'

  // Helper function to try fallback providers
  const tryFallback = async (failedProvider: string, error: Error): Promise<AICriticalFindings | null> => {
    if (provider !== 'auto') return null
    
    // Log the original error that triggered fallback
    logger.debug(`Original ${failedProvider} error: ${error.message}`)
    
    // Try providers in order: Anthropic -> OpenAI -> Gemini
    const fallbackOrder = []
    if (failedProvider !== 'anthropic' && hasAnthropic) fallbackOrder.push('anthropic')
    if (failedProvider !== 'openai' && hasOpenAI) fallbackOrder.push('openai')
    if (failedProvider !== 'gemini' && hasGemini) fallbackOrder.push('gemini')
    
    for (const fallback of fallbackOrder) {
      try {
        logger.info(`Trying ${fallback} as fallback...`)
        if (fallback === 'anthropic') {
          return await analyzeWithClaude(packages, aiConfig)
        } else if (fallback === 'openai') {
          return await analyzeWithOpenAI(packages, aiConfig)
        } else if (fallback === 'gemini') {
          return await analyzeWithGemini(packages, aiConfig)
        }
      } catch (fallbackError) {
        logger.warn(`${fallback} fallback also failed: ${(fallbackError as Error).message}`)
      }
    }
    
    return null
  }
  
  // Try providers based on config
  if (provider === 'anthropic' || (provider === 'auto' && hasAnthropic)) {
    logger.debug('Using Anthropic Claude as primary provider')
    try {
      return await analyzeWithClaude(packages, aiConfig)
    } catch (error) {
      logger.warn(`Anthropic failed: ${(error as Error).message}`)
      const fallbackResult = await tryFallback('anthropic', error as Error)
      if (fallbackResult) return fallbackResult
      throw error
    }
  } else if (provider === 'openai' || (provider === 'auto' && hasOpenAI)) {
    logger.debug('Using OpenAI as primary provider')
    try {
      return await analyzeWithOpenAI(packages, aiConfig)
    } catch (error) {
      logger.warn(`OpenAI failed: ${(error as Error).message}`)
      const fallbackResult = await tryFallback('openai', error as Error)
      if (fallbackResult) return fallbackResult
      throw error
    }
  } else if (provider === 'gemini' || (provider === 'auto' && hasGemini)) {
    logger.debug('Using Google Gemini as primary provider')
    try {
      return await analyzeWithGemini(packages, aiConfig)
    } catch (error) {
      logger.warn(`Gemini failed: ${(error as Error).message}`)
      const fallbackResult = await tryFallback('gemini', error as Error)
      if (fallbackResult) return fallbackResult
      throw error
    }
  } else {
    throw new Error('No valid AI provider configuration found')
  }
}
