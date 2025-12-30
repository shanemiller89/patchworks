import {
  createPrompt,
  isDownKey,
  isEnterKey,
  isSpaceKey,
  isUpKey,
  useKeypress,
  usePrefix,
  useState,
  type KeypressEvent,
} from '@inquirer/core';
import chalk from 'chalk';
import _ from 'lodash';
import { SKIPPED, UNKNOWN } from '../utils/constants.js';
import { TableGenerator, TableCell } from '../utils/TableGenerator.js';
import { styles } from './styles.js';
import { renderMarkdownPreview } from '../utils/markdownRenderer.js';

interface PackageMetadata {
  name?: string;
  current: string;
  wanted?: string;
  latest: string;
  updateType: 'patch' | 'minor' | 'major' | string;
  updatingDifficulty?: number | string;
  githubUrl?: string;
  fallbackUrl?: string;
  releaseNotesCompatible?: boolean | string;
  fallbackACompatible?: boolean | string;
  fallbackBCompatible?: boolean | string;
  homepage?: string;
  breakingChanges?: any;
  newFeatures?: any;
  validationStatus?: string;
  [key: string]: any;
}

interface PreUpdateReport {
  packageName: string;
  metadata: PackageMetadata;
}

interface IncludedPackage {
  packageName: string;
  metadata: PackageMetadata;
}

interface ExcludedPackage {
  packageName?: string;
  reason: string;
  metadata: PackageMetadata;
}

interface PackageWithLogs {
  packageName: string;
  metadata: PackageMetadata;
  changelog?: string | null;
  releaseNotes?: Array<{ notes?: string }> | null;
  source?: string;
  attemptedReleaseNotes?: boolean;
  attemptedFallbackA?: boolean;
  attemptedFallbackB?: boolean;
}

interface SelectedPackage {
  packageName: string;
  metadata: PackageMetadata;
}

interface CustomPromptConfig {
  task: any;
  packages: PreUpdateReport[];
}

/**
 * Displays pre-update reports in a tabular format.
 * Generates a table with package information and update details.
 * @param preUpdateReports - An array of package update reports.
 * @returns A promise that resolves to the generated table output.
 */
export function displayPreUpdateReports(
  preUpdateReports: PreUpdateReport[]
): Promise<string> {
  return new Promise((resolve) => {
    const headers = [
      'Package',
      'Current',
      'Latest',
      'Update Type',
      'Breaking Changes',
      'New Features',
    ];

    const data: TableCell[][] = preUpdateReports.map((packageData) => [
      { value: packageData.packageName },
      { value: packageData.metadata.current },
      { value: packageData.metadata.latest },
      { value: packageData.metadata.updateType, type: 'semantic' },
      {
        value: _.isEmpty(packageData.metadata.breakingChanges),
        type: 'boolean',
      },
      {
        value: _.isEmpty(packageData.metadata.newFeatures),
        type: 'boolean',
      },
    ]);

    const tableGenerator = new TableGenerator(headers, data, {
      fullWidth: true,
      title: 'Pre-Update Reports',
      columnConfig: (baseWidth: number, terminalWidth: number) => ({
        0: { width: 20 },
        4: { width: Math.min(baseWidth * 2, terminalWidth / 3) },
        5: { width: Math.min(baseWidth * 2, terminalWidth / 3) },
      }),
    });

    const output = tableGenerator.generateTable();
    resolve(output);
  });
}

export function displayIncludedPackages(
  includedPackages: IncludedPackage[]
): Promise<string> {
  return new Promise((resolve) => {
    const headers = [
      'Package',
      'Current',
      'Wanted',
      'Latest',
      'Update Type',
      'Update Difficulty',
      'GitHub URL',
      'RN Compatible',
      'FB A Compatible',
      'FB B Compatible',
      'Homepage',
    ];

    const data: TableCell[][] = includedPackages.map((packageData) => [
      { value: packageData.packageName },
      { value: packageData.metadata.current },
      { value: packageData.metadata.wanted },
      { value: packageData.metadata.latest },
      { value: packageData.metadata.updateType, type: 'semantic' },
      { value: packageData.metadata.updatingDifficulty },
      { value: packageData.metadata.githubUrl },
      {
        value: ![false, 'UNKNOWN', 'SKIPPED'].includes(
          packageData.metadata.releaseNotesCompatible as any
        ),
        type: 'boolean',
      },
      {
        value: ![false, 'UNKNOWN', 'SKIPPED'].includes(
          packageData.metadata.fallbackACompatible as any
        ),
        type: 'boolean',
      },
      {
        value: ![false, 'UNKNOWN', 'SKIPPED'].includes(
          packageData.metadata.fallbackBCompatible as any
        ),
        type: 'boolean',
      },
      { value: packageData.metadata.homepage },
    ]);

    const tableGenerator = new TableGenerator(headers, data, {
      fullWidth: true,
      title: 'Included Packages',
      columnConfig: (baseWidth: number, terminalWidth: number) => ({
        0: { width: 20 },
        6: { width: Math.min(baseWidth * 2, terminalWidth / 3) },
        10: { width: Math.min(baseWidth * 2, terminalWidth / 3) },
      }),
    });

    const output = tableGenerator.generateTable();
    resolve(output);
  });
}

export function displayExcludedPackages(
  excludedPackages: ExcludedPackage[]
): Promise<string> {
  return new Promise((resolve) => {
    const headers = [
      'Package',
      'Reason',
      'Current',
      'Wanted',
      'Latest',
      'Update Type',
      'Update Difficulty',
      'Validation Status',
    ];

    const data: TableCell[][] = excludedPackages.map((packageData) => [
      { value: packageData.packageName || packageData.metadata.name },
      { value: packageData.reason },
      { value: packageData.metadata.current },
      { value: packageData.metadata.wanted },
      { value: packageData.metadata.latest },
      { value: packageData.metadata.updateType, type: 'semantic' },
      { value: packageData.metadata.updatingDifficulty },
      { value: packageData.metadata.validationStatus },
    ]);

    const tableGenerator = new TableGenerator(headers, data, {
      fullWidth: true,
      title: 'Excluded Packages',
      columnConfig: () => ({
        0: { width: 20 },
        1: { width: 20 },
        2: { width: 10 },
        3: { width: 10 },
        4: { width: 10 },
        5: { width: 15 },
        6: { width: 20 },
        7: { width: 20 },
      }),
    });

    const output = tableGenerator.generateTable();
    resolve(output);
  });
}

export function displayResultsTable(
  packages: PackageWithLogs[]
): Promise<string> {
  return new Promise((resolve) => {
    const headers = [
      'Package',
      'Current -> Latest',
      'GitHub URL',
      'Fallback URL',
      'Release Notes Compatible',
      'Fallback A Compatible',
      'Fallback B Compatible',
      'Changelog',
      'Release Notes',
      'Source',
      'T RN',
      'T FA',
      'T FB',
    ];

    const data: TableCell[][] = packages.map((packageData) => [
      { value: packageData.packageName },
      { value: `${packageData.metadata.current} -> ${packageData.metadata.latest}` },
      { value: packageData.metadata.githubUrl },
      { value: packageData.metadata.fallbackUrl },
      {
        value: ![false, UNKNOWN, SKIPPED].includes(
          packageData.metadata.releaseNotesCompatible as any
        ),
        type: 'boolean',
      },
      {
        value: ![false, UNKNOWN, SKIPPED].includes(
          packageData.metadata.fallbackACompatible as any
        ),
        type: 'boolean',
      },
      {
        value: ![false, UNKNOWN, SKIPPED].includes(
          packageData.metadata.fallbackBCompatible as any
        ),
        type: 'boolean',
      },
      { value: packageData.changelog },
      { value: packageData.releaseNotes?.[0]?.notes || null },
      { value: packageData.source },
      { value: packageData.attemptedReleaseNotes, type: 'boolean' },
      { value: packageData.attemptedFallbackA, type: 'boolean' },
      { value: packageData.attemptedFallbackB, type: 'boolean' },
    ]);

    const tableGenerator = new TableGenerator(headers, data, {
      fullWidth: true,
      title: 'Results Table',
      columnConfig: () => ({
        0: { width: 20 },
        2: { width: 20 },
        3: { width: 20 },
        7: { width: 15, truncate: 50 },
        8: { width: 15, truncate: 50 },
      }),
    });

    const output = tableGenerator.generateTable();
    resolve(output);
  });
}

/**
 * Displays AI-generated critical findings in a formatted output
 * @param findings - AI critical findings object
 * @returns Formatted string with AI findings
 */
export function displayAIFindings(findings: any, showPreview: boolean = true): string {
  const { markdownContent, summary, provider, hasBreakingChanges, hasSecurityIssues, packageCount } = findings;

  let output = '\n';
  output += chalk.bold.cyan('━'.repeat(100)) + '\n';
  output += chalk.bold.magenta('🤖 AI Critical Findings Summary\n');
  output += chalk.dim(`Provider: ${provider} | Packages: ${packageCount}\n`);
  output += chalk.bold.cyan('━'.repeat(100)) + '\n\n';

  // Show key indicators first
  output += chalk.bold.white('Quick Status:\n');
  if (hasBreakingChanges) {
    output += chalk.red('  🚨 Contains breaking changes - review migration steps carefully\n');
  } else {
    output += chalk.green('  ✅ No breaking changes detected\n');
  }
  
  if (hasSecurityIssues) {
    output += chalk.yellow('  🔒 Security issues identified - address immediately\n');
  } else {
    output += chalk.green('  ✅ No security issues detected\n');
  }
  output += '\n';

  // Render markdown preview if available
  if (showPreview && markdownContent) {
    output += chalk.bold.cyan('📄 Analysis Preview:\n');
    output += chalk.dim('─'.repeat(100)) + '\n\n';
    
    // Use markdown renderer
    try {
      const preview = renderMarkdownPreview(markdownContent, 40);
      output += preview + '\n\n';
    } catch (error) {
      // Fallback if renderer fails
      output += chalk.gray(summary) + '\n\n';
    }
    
    output += chalk.dim('─'.repeat(100)) + '\n';
    output += chalk.dim('Full report saved to: AI-CRITICAL-FINDINGS.md\n\n');
  } else {
    // Fallback to simple summary
    output += chalk.bold.white('Executive Summary:\n');
    output += chalk.gray(summary) + '\n\n';
    
    output += chalk.bold.cyan('📄 Full Analysis Report:\n');
    output += chalk.dim('  A comprehensive markdown report with code examples and mermaid diagrams\n');
    output += chalk.dim('  has been generated in: AI-CRITICAL-FINDINGS.md\n\n');
    output += chalk.dim('  The report includes:\n');
    output += chalk.dim('  • Detailed breaking changes with before/after code examples\n');
    output += chalk.dim('  • Security vulnerabilities with CVE numbers and severity\n');
    output += chalk.dim('  • Step-by-step migration guide with code snippets\n');
    output += chalk.dim('  • Visual dependency flow diagram (Mermaid)\n');
    output += chalk.dim('  • Recommended update order with risk assessment\n\n');
  }

  output += chalk.bold.cyan('━'.repeat(100)) + '\n';

  return output;
}

export function displayFinalReports(
  selectedPackages: SelectedPackage[]
): Promise<string> {
  return new Promise((resolve) => {
    const headers = ['Package', 'Current', 'Latest', 'Update Type'];

    const data: TableCell[][] = selectedPackages.map((packageData) => [
      { value: packageData.packageName },
      { value: packageData.metadata.current },
      { value: packageData.metadata.latest },
      { value: packageData.metadata.updateType, type: 'semantic' },
    ]);

    const tableGenerator = new TableGenerator(headers, data, {
      fullWidth: true,
      title: 'Final Reports',
      columnConfig: () => ({
        0: { width: 40 },
        1: { width: 10 },
        2: { width: 10 },
        3: { width: 15 },
      }),
    });

    const output = tableGenerator.generateTable();
    resolve(output);
  });
}

export const customTablePrompt = createPrompt(
  (config: CustomPromptConfig, done: (value: PreUpdateReport[]) => void) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [selectedPackages, setSelectedPackages] = useState<number[]>([]);
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState<string | null>(null);
    const prefix = usePrefix({ status });

    const { task } = config;

    const headers = [
      'Package',
      'Current',
      'Latest',
      'Update Type',
      'Breaking Changes',
      'New Features',
    ];

    const data: TableCell[][] = config.packages.map((pkg, index) => [
      {
        value:
          index === selectedIndex
            ? chalk.cyanBright(
                `${
                  selectedPackages.includes(index)
                    ? `${styles.success('☑')}`
                    : '☐'
                } ${pkg.packageName}`
              )
            : `  ${
                selectedPackages.includes(index) ? `${styles.success('☑')}` : '☐'
              } ${pkg.packageName}`,
      },
      { value: pkg.metadata.current },
      { value: pkg.metadata.latest },
      { value: pkg.metadata.updateType, type: 'semantic' },
      {
        value: pkg.metadata.breakingChanges,
      },
      {
        value: _.isEmpty(pkg.metadata.newFeatures),
        type: 'boolean',
      },
    ]);

    const tableGenerator = new TableGenerator(headers, data, {
      fullWidth: true,
      title: 'Select Packages',
      columnConfig: () => ({
        0: { width: 40 },
        1: { width: 10 },
        2: { width: 10 },
        3: { width: 15 },
        4: { width: 15 },
        5: { width: 15 },
      }),
    });

    const output = tableGenerator.generateTable();

    useKeypress((key: KeypressEvent) => {
      if (isEnterKey(key)) {
        if (selectedPackages.length > 0) {
          setStatus('done');
          const selectedItems = selectedPackages.map(
            (index) => config.packages[index]
          );
          done(selectedItems);
        } else {
          setError('No packages selected. Please select at least one package.');
        }
      } else if (isUpKey(key)) {
        setSelectedIndex(
          (selectedIndex - 1 + config.packages.length) % config.packages.length
        );
      } else if (isDownKey(key)) {
        setSelectedIndex((selectedIndex + 1) % config.packages.length);
      } else if (isSpaceKey(key)) {
        if (selectedPackages.includes(selectedIndex)) {
          setSelectedPackages(selectedPackages.filter((i) => i !== selectedIndex));
        } else {
          setSelectedPackages([...selectedPackages, selectedIndex]);
        }
        setError(null);
      } else if (key.name === 'a') {
        setSelectedPackages(config.packages.map((_, index) => index));
      } else if (key.name === 'i') {
        setSelectedPackages(
          config.packages
            .map((_, index) => index)
            .filter((index) => !selectedPackages.includes(index))
        );
      } else if (key.name === 'c') {
        setStatus('done');
        done([]);
        config.task.skip('User cancelled');
        config.task.title = 'User cancelled';
        task.skip('User cancelled');
        task.title = 'User cancelled';
      }
    });

    return `${prefix} Select packages to update (Press ${chalk.bold.cyanBright(
      '<space>'
    )} to select, ${chalk.bold.cyanBright(
      '<a>'
    )} to toggle all, ${chalk.bold.cyanBright(
      '<i>'
    )} to invert selection, and ${chalk.bold.cyanBright(
      '<enter>'
    )} to proceed and ${chalk.bold.cyanBright(
      '<c>'
    )} to cancel and exit.):\n${output}\n${error ? chalk.red(error) : ''}`;
  }
);
