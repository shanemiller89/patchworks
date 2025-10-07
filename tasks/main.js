import { ListrInquirerPromptAdapter } from '@listr2/prompt-adapter-inquirer';
import { color, Listr, PRESET_TIMER } from 'listr2';
import { parseIncludedPackage } from '../analysis/analyzeLogData.js';
import { fetchChangelog } from '../versionLogs/fetchChangelog.js';
import { fetchCommits } from '../versionLogs/fetchCommits.js';
import { fetchReleaseNotes } from '../versionLogs/fetchReleaseNotes.js';
import { bundleReports } from '../reports/generateReports.js';
import logger from '../reports/logger.js';
import { RELEASE_NOTES, SKIPPED, UNKNOWN } from '../utils/constants.js';
import { installDependencies, writeChanges } from '../utils/updatingHelpers.js';
import { processPackageVersions } from './versionProcessor/versionProcessor.js';
import { promptUserForReportDirectory, askToContinue, } from '../prompts/prompts.js';
import _ from 'lodash';
import { displayResultsTable, customTablePrompt, displayFinalReports, } from '../reports/consoleTaskReports.js';
export async function main(options) {
    const { reportsOnly } = options;
    const tasks = new Listr([
        // Step 1: Prompt user for custom directory
        {
            title: 'Check for or create Reporting Directory',
            task: async (ctx, task) => {
                ctx.reportDir = await promptUserForReportDirectory(task);
            },
        },
        // Step 2: Evaluate outdated dependencies
        {
            title: 'Evaluate outdated packages',
            task: async (ctx, task) => {
                return await processPackageVersions(task, options);
            },
        },
        // Step 3: Fetch release notes and changelogs
        {
            title: 'Fetch release notes and changelogs',
            task: async (ctx, task) => {
                const subTasks = ctx.includedPackages.map((pkg) => ({
                    title: `Fetch data for ${pkg.packageName}`,
                    task: async (ctx, task) => {
                        const { packageName, metadata } = pkg;
                        return task.newListr([
                            {
                                title: 'Fetch release notes',
                                enabled: () => metadata.releaseNotesCompatible,
                                task: async (ctx) => {
                                    pkg.releaseNotes = await fetchReleaseNotes({
                                        packageName,
                                        metadata,
                                    });
                                    if (pkg.releaseNotes) {
                                        pkg.changelog = SKIPPED;
                                        pkg.source = RELEASE_NOTES;
                                        ctx.source = RELEASE_NOTES;
                                    }
                                    else {
                                        pkg.releaseNotes = SKIPPED;
                                        pkg.source = UNKNOWN;
                                        ctx.source = UNKNOWN;
                                    }
                                    return (pkg.attemptedReleaseNotes = true);
                                },
                            },
                            {
                                title: 'Fetch changelog',
                                enabled: () => metadata.fallbackACompatible,
                                skip: (ctx) => ctx.source === RELEASE_NOTES,
                                task: async (ctx) => {
                                    pkg.changelog = await fetchChangelog({
                                        packageName,
                                        metadata,
                                    });
                                    if (pkg.changelog) {
                                        pkg.releaseNotes = SKIPPED;
                                        pkg.source = 'fallbackA';
                                        ctx.source = 'fallbackA';
                                    }
                                    else {
                                        pkg.changelog = SKIPPED;
                                        pkg.source = UNKNOWN;
                                        ctx.source = UNKNOWN;
                                    }
                                    return (pkg.attemptedFallbackA = true);
                                },
                            },
                            {
                                title: 'Fetch commits',
                                enabled: () => metadata.fallbackBCompatible,
                                skip: (ctx) => ctx.source === RELEASE_NOTES ||
                                    ctx.source === 'fallbackA',
                                task: async (ctx) => {
                                    pkg.changelog = await fetchCommits({
                                        packageName,
                                        metadata,
                                    });
                                    if (pkg.changelog) {
                                        pkg.releaseNotes = SKIPPED;
                                        pkg.source = 'fallbackB';
                                        ctx.source = 'fallbackB';
                                    }
                                    else {
                                        pkg.changelog = SKIPPED;
                                        pkg.releaseNotes = SKIPPED;
                                        pkg.source = UNKNOWN;
                                        ctx.source = UNKNOWN;
                                    }
                                    return (pkg.attemptedFallbackB = true);
                                },
                            },
                            {
                                title: 'Set unknown status',
                                enabled: () => !metadata.releaseNotesCompatible &&
                                    !metadata.fallbackACompatible &&
                                    !metadata.fallbackBCompatible,
                                task: async () => {
                                    if (!pkg.releaseNotes && !pkg.changelog) {
                                        pkg.changelog = UNKNOWN;
                                        pkg.releaseNotes = UNKNOWN;
                                        pkg.source = UNKNOWN;
                                    }
                                },
                            },
                        ], { concurrent: false, exitOnError: false });
                    },
                }));
                return task.newListr(subTasks, { concurrent: false });
            },
        },
        // New Task: Display results and ask to proceed
        {
            title: 'Display results and ask to proceed',
            task: async (ctx, task) => {
                const resultsTable = await displayResultsTable(ctx.includedPackages);
                task.output = `Results:\n${resultsTable}`;
                const shouldContinue = await askToContinue(task, 'Proceed to parse and categorize logs?');
                if (!shouldContinue) {
                    throw new Error('Operation cancelled by the user.');
                }
            },
            rendererOptions: { bottomBar: 999 },
        },
        // Step 4: Parse and categorize logs
        {
            title: 'Parse and categorize logs',
            task: async (ctx, task) => {
                const subTasks = ctx.includedPackages.map((pkg) => ({
                    title: `Parse logs for ${pkg.packageName}`,
                    skip: () => {
                        const { releaseNotes, changelog } = pkg;
                        return (_.isEmpty(releaseNotes) ||
                            releaseNotes == UNKNOWN ||
                            releaseNotes == SKIPPED) &&
                            (!changelog || changelog === UNKNOWN || changelog === SKIPPED)
                            ? 'Both releaseNotes and changelog are unavailable, skipping parsing.'
                            : false;
                    },
                    task: async () => {
                        const result = await parseIncludedPackage(pkg);
                        pkg.importantTerms = result.importantTerms;
                        pkg.categorizedNotes = result.categorizedNotes;
                    },
                }));
                return task.newListr(subTasks, { concurrent: false });
            },
        },
        // Step 5: Generate pre-update reports
        {
            title: 'Select packages to update',
            enabled: () => !reportsOnly,
            task: async (ctx, task) => {
                // Use the custom table prompt to select packages
                ctx.selectedPackages = await task
                    .prompt(ListrInquirerPromptAdapter)
                    .run(customTablePrompt, {
                    packages: ctx.includedPackages,
                    task: task,
                });
            },
            rendererOptions: { bottomBar: 999 },
        },
        // Step 6: Write changes to package.json (optional)
        {
            title: 'Write changes to package.json',
            enabled: () => !reportsOnly,
            task: async (ctx) => {
                await writeChanges(ctx.selectedPackages);
            },
        },
        // Step 7: Install updated dependencies (optional)
        {
            title: 'Install updated dependencies',
            enabled: () => options.install && !reportsOnly,
            task: async () => {
                installDependencies();
            },
        },
        {
            title: 'Final Reports',
            task: async (ctx, task) => {
                if (!reportsOnly) {
                    const finalReports = await displayFinalReports(ctx.selectedPackages);
                    const reports = await bundleReports(ctx.selectedPackages, ctx.reportDir);
                    task.title = reports;
                    task.output = finalReports;
                }
                else {
                    const finalReports = await displayFinalReports(ctx.includedPackages);
                    const reports = await bundleReports(ctx.includedPackages, ctx.reportDir);
                    task.title = reports;
                    task.output = finalReports;
                }
            },
            rendererOptions: { bottomBar: 999, persistentOutput: true },
        },
    ], {
        collectErrors: 'full',
        concurrent: false,
        exitOnError: true,
        rendererOptions: {
            collapseSubtasks: false,
            collapseSkips: false,
            collapseErrors: false,
            timer: {
                ...PRESET_TIMER,
                condition: (duration) => duration > 250,
                format: (duration) => {
                    return duration > 10000 ? color.red : color.green;
                },
            },
        },
    });
    try {
        await tasks.run();
        logger.success('Workflow completed successfully!');
    }
    catch (err) {
        logger.error(`Workflow failed: ${err.message}`);
    }
}
