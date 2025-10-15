import { ListrInquirerPromptAdapter } from '@listr2/prompt-adapter-inquirer'
import { color, Listr, PRESET_TIMER } from 'listr2'
import { parseIncludedPackage } from '../analysis/analyzeLogData.js'
import { fetchChangelog } from '../versionLogs/fetchChangelog.js'
import { fetchCommits } from '../versionLogs/fetchCommits.js'
import { fetchReleaseNotes } from '../versionLogs/fetchReleaseNotes.js'
import { bundleReports } from '../reports/generateReports.js'
import logger from '../reports/logger.js'
import { RELEASE_NOTES, SKIPPED, UNKNOWN } from '../utils/constants.js'
import { installDependencies, writeChanges } from '../utils/updatingHelpers.js'
import { processPackageVersions } from './versionProcessor/versionProcessor.js'
import {
  promptUserForReportDirectory,
  askToContinue,
} from '../prompts/prompts.js'
import _ from 'lodash'
import {
  displayResultsTable,
  customTablePrompt,
  displayFinalReports,
  displayAIFindings,
} from '../reports/consoleTaskReports.js'
import { FinalOptions } from '../src/cli/index.js'
import { shouldInstallDependencies } from './installGuard.js'
import type { IncludedPackage, PackageWithLogs } from '../types/index.js'
import { generateCriticalFindings } from '../analysis/aiAnalyzer.js'
import { readConfig } from '../config/configUtil.js'

export interface TaskContext {
  reportDir?: string
  includedPackages?: PackageWithLogs[]
  selectedPackages?: IncludedPackage[]
  source?: string
  aiFindings?: import('../types/index.js').AICriticalFindings
  [key: string]: any
}

// Re-export types for backward compatibility
export type { PackageWithLogs, IncludedPackage }

export interface TaskFunction {
  (ctx: TaskContext, task: any): Promise<any> | any
}

export interface TaskDefinition {
  title: string
  task?: TaskFunction
  enabled?: () => boolean
  skip?: (ctx: TaskContext) => boolean | string
}

export async function main(options: FinalOptions): Promise<void> {
  const { reportsOnly } = options

  const tasks = new Listr<TaskContext>(
    [
      // Step 1: Prompt user for custom directory
      {
        title: 'Check for or create Reporting Directory',
        task: async (ctx: TaskContext, task: any) => {
          ctx.reportDir = await promptUserForReportDirectory(task)
        },
      },
      // Step 2: Evaluate outdated dependencies
      {
        title: 'Evaluate outdated packages',
        task: async (ctx: TaskContext, task: any) => {
          // processPackageVersions populates ctx.includedPackages and ctx.excludedPackages directly
          return await processPackageVersions(task, options)
        },
      },
      // Step 3: Fetch release notes and changelogs
      {
        title: 'Fetch release notes and changelogs',
        skip: (ctx: TaskContext) => {
          if (!ctx.includedPackages || ctx.includedPackages.length === 0) {
            return 'No packages to process'
          }
          return false
        },
        task: async (ctx: TaskContext, task: any) => {
          const subTasks = ctx.includedPackages!.map((pkg: PackageWithLogs) => ({
            title: `Fetch data for ${pkg.packageName}`,
            task: async (ctx: TaskContext, task: any) => {
              const { packageName, metadata } = pkg

              return task.newListr(
                [
                  {
                    title: 'Fetch release notes',
                    enabled: () => metadata.releaseNotesCompatible,
                    task: async (ctx: TaskContext) => {
                      pkg.releaseNotes = await (fetchReleaseNotes as any)({
                        packageName,
                        metadata,
                      })
                      if (pkg.releaseNotes) {
                        pkg.changelog = SKIPPED
                        pkg.source = RELEASE_NOTES
                        ctx.source = RELEASE_NOTES
                      } else {
                        pkg.releaseNotes = SKIPPED
                        pkg.source = UNKNOWN
                        ctx.source = UNKNOWN
                      }

                      return (pkg.attemptedReleaseNotes = true)
                    },
                  },
                  {
                    title: 'Fetch changelog',
                    enabled: () => metadata.fallbackACompatible,
                    skip: (ctx: TaskContext) => ctx.source === RELEASE_NOTES,
                    task: async (ctx: TaskContext) => {
                      pkg.changelog = await (fetchChangelog as any)({
                        packageName,
                        metadata,
                      })
                      if (pkg.changelog) {
                        pkg.releaseNotes = SKIPPED
                        pkg.source = 'fallbackA'
                        ctx.source = 'fallbackA'
                      } else {
                        pkg.changelog = SKIPPED
                        pkg.source = UNKNOWN
                        ctx.source = UNKNOWN
                      }

                      return (pkg.attemptedFallbackA = true)
                    },
                  },
                  {
                    title: 'Fetch commits',
                    enabled: () => metadata.fallbackBCompatible,
                    skip: (ctx: TaskContext) =>
                      ctx.source === RELEASE_NOTES ||
                      ctx.source === 'fallbackA',
                    task: async (ctx: TaskContext) => {
                      pkg.changelog = await (fetchCommits as any)({
                        packageName,
                        metadata,
                      })
                      if (pkg.changelog) {
                        pkg.releaseNotes = SKIPPED
                        pkg.source = 'fallbackB'
                        ctx.source = 'fallbackB'
                      } else {
                        pkg.changelog = SKIPPED
                        pkg.releaseNotes = SKIPPED
                        pkg.source = UNKNOWN
                        ctx.source = UNKNOWN
                      }

                      return (pkg.attemptedFallbackB = true)
                    },
                  },
                  {
                    title: 'Set unknown status',
                    enabled: () =>
                      !metadata.releaseNotesCompatible &&
                      !metadata.fallbackACompatible &&
                      !metadata.fallbackBCompatible,
                    task: async () => {
                      if (!pkg.releaseNotes && !pkg.changelog) {
                        pkg.changelog = UNKNOWN
                        pkg.releaseNotes = UNKNOWN
                        pkg.source = UNKNOWN
                      }
                    },
                  },
                ],
                { concurrent: false, exitOnError: false },
              )
            },
          }))

          return task.newListr(subTasks, { concurrent: false })
        },
      },
      // New Task: Display results and ask to proceed
      {
        title: 'Display results and ask to proceed',
        task: async (ctx: TaskContext, task: any) => {
          const resultsTable = await displayResultsTable(ctx.includedPackages!)
          task.output = `Results:\n${resultsTable}`

          const shouldContinue = await askToContinue(
            task,
            'Proceed to parse and categorize logs?',
          )
          if (!shouldContinue) {
            throw new Error('Operation cancelled by the user.')
          }
        },
        rendererOptions: { bottomBar: 999 },
      },
      // Step 4: Parse and categorize logs
      {
        title: 'Parse and categorize logs',
        skip: (ctx: TaskContext) => {
          if (!ctx.includedPackages || ctx.includedPackages.length === 0) {
            return 'No packages to process'
          }
          return false
        },
        task: async (ctx: TaskContext, task: any) => {
          const subTasks = ctx.includedPackages!.map((pkg: PackageWithLogs) => ({
            title: `Parse logs for ${pkg.packageName}`,
            skip: () => {
              const { releaseNotes, changelog } = pkg
              return (_.isEmpty(releaseNotes) ||
                releaseNotes === UNKNOWN ||
                releaseNotes === SKIPPED) &&
                (!changelog || changelog === UNKNOWN || changelog === SKIPPED)
                ? 'Both releaseNotes and changelog are unavailable, skipping parsing.'
                : false
            },
            task: async () => {
              const result = await parseIncludedPackage(pkg)
              pkg.importantTerms = result.importantTerms
              pkg.categorizedNotes = result.categorizedNotes
            },
          }))

          return task.newListr(subTasks, { concurrent: false })
        },
      },
      // Step 5: Generate AI critical findings summary (optional)
      {
        title: 'Generate AI critical findings summary',
        enabled: () => options.aiSummary,
        skip: (ctx: TaskContext) => {
          if (!ctx.includedPackages || ctx.includedPackages.length === 0) {
            return 'No packages to analyze'
          }
          return false
        },
        task: async (ctx: TaskContext, task: any) => {
          const config = await readConfig()

          if (!config?.ai?.anthropicApiKey && !config?.ai?.openaiApiKey && !config?.ai?.geminiApiKey) {
            logger.warn(
              'AI analysis requires API keys in config file. ' +
                'Add "anthropicApiKey", "openaiApiKey", or "geminiApiKey" to the "ai" section in patchworks-config.json',
            )
            task.skip('No API keys configured')
            return
          }

          task.output = 'Analyzing release notes with AI...'
          try {
            ctx.aiFindings = await generateCriticalFindings(
              ctx.includedPackages!,
              config.ai,
            )
            task.output = `AI analysis complete (provider: ${ctx.aiFindings.provider})`
            logger.success(
              `Generated AI summary using ${ctx.aiFindings.provider}`,
            )
          } catch (error) {
            const errorMessage = (error as Error).message
            logger.warn(`AI analysis failed: ${errorMessage}`)
            
            // Check if it's a quota/billing error
            if (errorMessage.includes('quota') || errorMessage.includes('429')) {
              logger.warn('💡 Tip: Check your API billing and quota at:')
              logger.warn('   - Anthropic: https://console.anthropic.com/')
              logger.warn('   - OpenAI: https://platform.openai.com/account/billing')
            }
            
            // Don't throw - allow workflow to continue without AI analysis
            task.skip('AI analysis failed (continuing workflow)')
          }
        },
      },
      // Step 6: Select packages to update
      {
        title: 'Select packages to update',
        enabled: () => !reportsOnly,
        task: async (ctx: TaskContext, task: any) => {
          // Use the custom table prompt to select packages
          ctx.selectedPackages = await task
            .prompt(ListrInquirerPromptAdapter)
            .run(customTablePrompt, {
              packages: ctx.includedPackages,
              task: task,
            })
        },
        rendererOptions: { bottomBar: 999 },
      },
      // Step 7: Write changes to package.json (optional)
      {
        title: 'Write changes to package.json',
        enabled: () => !reportsOnly,
        task: async (ctx: TaskContext) => {
          await writeChanges(ctx.selectedPackages!)
        },
      },
      // Step 8: Install updated dependencies (optional)
      {
        title: 'Install updated dependencies',
        enabled: () => shouldInstallDependencies(options),
        task: async () => {
          installDependencies()
        },
      },
      {
        title: 'Final Reports',
        task: async (ctx: TaskContext, task: any) => {
          let finalOutput = ''

          if (!reportsOnly) {
            const finalReports = await displayFinalReports(ctx.selectedPackages!)
            finalOutput = finalReports

            // Add AI findings if available
            if (ctx.aiFindings) {
              finalOutput += '\n' + displayAIFindings(ctx.aiFindings)
            }

            const reports = await bundleReports(
              ctx.selectedPackages!,
              ctx.reportDir!,
              ctx.aiFindings,
            )
            task.title = reports
            task.output = finalOutput
          } else {
            const finalReports = await displayFinalReports(ctx.includedPackages!)
            finalOutput = finalReports

            // Add AI findings if available
            if (ctx.aiFindings) {
              finalOutput += '\n' + displayAIFindings(ctx.aiFindings)
            }

            const reports = await bundleReports(
              ctx.includedPackages!,
              ctx.reportDir!,
              ctx.aiFindings,
            )
            task.title = reports
            task.output = finalOutput
          }
        },
        rendererOptions: { bottomBar: 999, persistentOutput: true },
      },
    ],
    {
      collectErrors: 'full',
      concurrent: false,
      exitOnError: true,
      rendererOptions: {
        collapseSubtasks: false,
        collapseSkips: false,
        collapseErrors: false,
        timer: {
          ...PRESET_TIMER,
          condition: (duration: number) => duration > 250,
          format: (duration: number) => {
            return duration > 10000 ? color.red : color.green
          },
        },
      },
    },
  )

  try {
    await tasks.run()
    logger.success('Workflow completed successfully!')
  } catch (err) {
    logger.error(`Workflow failed: ${(err as Error).message}`)
  }
}
