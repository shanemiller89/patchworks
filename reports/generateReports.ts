import _ from 'lodash';
import logger from './logger.js';
import fs from 'fs';
import { UNKNOWN } from '../utils/constants.js';
import { ALL } from '../utils/constants.js';
import tar from 'tar-stream';
import path from 'path';
import type { PackageWithLogs, AICriticalFindings } from '../types/index.js';

interface Author {
  name?: string;
  email?: string;
  [key: string]: any;
}

interface Repository {
  url: string;
  [key: string]: any;
}

interface PackageMetadata {
  current: string;
  wanted?: string;
  latest: string;
  updateType: string;
  author?: Author;
  description?: string;
  repository: Repository;
  homepage?: string;
  [key: string]: any;
}

interface CategorizedNote {
  version: string;
  published_at?: string;
  categorized: {
    [category: string]: string[];
  };
}

interface ReleaseNote {
  notes: string;
  version: string;
  published_at?: string;
}

const generatePackageDetails = (pkg: PackageWithLogs): string => {
  const {
    packageName,
    metadata
  } = pkg;
  const {
    current,
    latest,
    updateType,
    author,
    description,
    repository,
    homepage
  } = metadata;
  
  const packageDetails = `
## ${packageName}

**Description:** ${description || 'No description provided'}

**Current Version:** ${current}

**Latest Version:** ${latest}

**Update Type:** ${updateType}

**Author:** ${author?.name || 'Unknown'} (${
    author?.email || 'No email provided'
  })

**Repository:** ${repository ? `[${repository.url}](${repository.url})` : 'Not available'}

**Homepage:** ${homepage ? `[${homepage}](${homepage})` : 'Not available'}

---

`;
  return packageDetails;
};

/**
 * Sanitizes a filename by removing disallowed characters.
 * @param filename - The filename to sanitize.
 * @returns The sanitized filename.
 */
function sanitizeFilename(filename: string): string {
  // Remove `@` at the beginning and replace disallowed characters
  return filename.replace(/^@/, '').replace(/[/\\<>:"|?*]/g, '-');
}

/**
 * Generates a markdown report for a package update.
 * @param data - The data for generating the report.
 * @returns The generated markdown report.
 */
export function generatePatchworkReport(data: PackageWithLogs): string {
  try {
    const { packageName, categorizedNotes } = data;

    if (!categorizedNotes) {
      logger.warn(`No categorized notes available for ${packageName}`);
      return `# ${packageName} Update Report\n\nNo categorized release notes available.\n`;
    }

    if (!Array.isArray(categorizedNotes)) {
      logger.error(`categorizedNotes is not an array for ${packageName}: ${JSON.stringify(categorizedNotes)}`);
      return `# ${packageName} Update Report\n\nError: Invalid categorized notes format.\n`;
    }

    logger.debug(`categorizedNotes: ${categorizedNotes}`);

    const header = `# ${packageName} Update Report\n`;
    const packageDetails = generatePackageDetails(data);

    const categorizedNotesSection = categorizedNotes
      .map((versionNote) => {
        const categories = Object.entries(versionNote.categorized)
          .filter(([, items]) => items.length > 0)
          .map(
            ([categoryName, items]) =>
              `### ${
                categoryName.charAt(0).toUpperCase() + categoryName.slice(1)
              }\n- ${items.join('\n- ')}`
          )
          .join('\n\n');

        return `
## Categorized Notes for Version ${versionNote.version} (Published: ${
          versionNote.published_at
        })
${categories || 'No categorized notes available.'}
`;
      })
      .join('\n');

    const markdown = [
      header,
      packageDetails,

      `## Categorized Notes\n`,
      categorizedNotesSection,
    ].join('\n');

    console.log('Markdown report generated as update-report.md');
    // fs.writeFileSync(
    //   `${sanitizeFilename(packageName)}_update-report.md`,
    //   markdown,
    // )
    return markdown;
  } catch (error) {
    logger.error('An error occurred while generating the report:', error);
    return 'An error occurred while generating the report.';
  }
}

export function generateOriginalNotes(data: PackageWithLogs): string {
  try {
    const { packageName, releaseNotes, changelog } = data;

    const notes: ReleaseNote[] =
      _.isEmpty(releaseNotes) ||
      releaseNotes === UNKNOWN ||
      releaseNotes === 'SKIPPED'
        ? [{ notes: changelog || '', version: ALL }]
        : (releaseNotes as ReleaseNote[]);

    if (_.isEmpty(notes)) {
      logger.error('Error: No original notes provided.');
      return 'Error: No original notes provided.';
    }

    const header = `# ${packageName} ${
      _.isEmpty(releaseNotes) ||
      releaseNotes === UNKNOWN ||
      releaseNotes === 'SKIPPED'
        ? 'Changelog'
        : 'Release Notes'
    } Notes\n`;
    const packageDetails = generatePackageDetails(data);

    const notesSection = notes
      .map((versionNote) => `## Version ${versionNote.version}\n${versionNote.notes}`)
      .join('\n\n');

    const markdown = [header, packageDetails, notesSection].join('\n');

    console.log('Original notes rendered.');
    return markdown;
  } catch (error) {
    logger.error('An error occurred while generating original notes:', error);
    return 'An error occurred while generating original notes.';
  }
}

/**
 * Generates AI findings report in markdown format
 * @param findings - AI critical findings object
 * @returns Markdown formatted AI findings report
 */
const generateAIFindingsReport = (findings: AICriticalFindings): string => {
  const { markdownContent, provider, timestamp, packageCount } = findings;

  // Build report header with metadata
  let report = `# AI Critical Findings Summary\n\n`;
  report += `> **Generated by:** ${provider.charAt(0).toUpperCase() + provider.slice(1)}\n`;
  report += `> **Timestamp:** ${new Date(timestamp).toLocaleString()}\n`;
  report += `> **Packages Analyzed:** ${packageCount}\n\n`;
  report += `---\n\n`;

  // Add the rich markdown content from AI (includes code blocks and mermaid diagrams)
  report += markdownContent;

  report += `\n\n---\n\n`;
  report += `*This analysis was generated using AI (${provider}). Please review and verify all recommendations before implementing changes.*\n`;

  return report;
};

export const bundleReports = async (
  includedPackages: PackageWithLogs[],
  reportDir: string,
  aiFindings?: AICriticalFindings
): Promise<string> => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const tarFileName = path.join(reportDir, `patchwork-run-${timestamp}.tar`);

    const pack = tar.pack();

    for (const pkg of includedPackages) {
      const { packageName } = pkg;
      const dirName = sanitizeFilename(packageName);

      // Generate reports
      const originalNotes = generateOriginalNotes(pkg);
      const patchworkReport = generatePatchworkReport(pkg);
      const jsonReport = JSON.stringify(pkg, null, 2);

      const jsonFileName = `${sanitizeFilename(packageName)}-raw.json`;

      pack.entry(
        {
          name: path.join(dirName, jsonFileName),
        },
        jsonReport
      );

      // Add original notes to the tarball
      pack.entry(
        {
          name: path.join(
            dirName,
            `${sanitizeFilename(packageName)}-original-notes.md`
          ),
        },
        originalNotes
      );

      // Add patchwork report to the tarball
      pack.entry(
        {
          name: path.join(
            dirName,
            `${sanitizeFilename(packageName)}-patchwork-report.md`
          ),
        },
        patchworkReport
      );
    }

    // Add AI findings report if available
    if (aiFindings) {
      const aiFindingsReport = generateAIFindingsReport(aiFindings);
      pack.entry(
        {
          name: 'AI-CRITICAL-FINDINGS.md',
        },
        aiFindingsReport
      );
    }

    // Finalize the tarball
    pack.finalize();

    // Write the tarball to the specified directory
    const writeStream = fs.createWriteStream(tarFileName);
    pack.pipe(writeStream);

    return new Promise((resolve, reject) => {
      writeStream.on('close', () => {
        console.log(`Reports bundled and saved to ${tarFileName}`);
        resolve(`Reports bundled and saved to ${tarFileName}`);
      });

      writeStream.on('error', (error) => {
        console.error('Error bundling reports:', error);
        reject(error);
      });
    });
  } catch (error) {
    console.error('Error bundling reports:', error);
    throw error;
  }
};
