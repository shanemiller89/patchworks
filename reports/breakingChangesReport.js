// reports/breakingChangesReport.js
import { extractBreakingChanges } from '../utils/breakingChangesProcessor.js'
import { formatBulletList, styles } from './styles.js'
import fs from 'fs'
import path from 'path'

/**
 * Generates a Markdown breaking changes report.
 * @param {Object} filteredPackages - Processed package update information.
 * @param {string} outputPath - (Optional) Path to save the Markdown report.
 */
export function breakingChangesReport(
  filteredPackages,
  outputPath = 'breaking-changes-report.md',
) {
  const lines = []
  const breakingChanges = extractBreakingChanges(filteredPackages)

  // Header Section
  lines.push(styles.headers('🔥 Breaking Changes Report 🔥'))
  lines.push(`Generated on: ${new Date().toLocaleString()}`)
  lines.push('\n---\n')

  if (breakingChanges.length === 0) {
    lines.push(styles.neutral('No breaking changes detected.'))
  } else {
    breakingChanges.forEach(
      ({ dPackage, currentVersion, newVersion, breaking, notes }, index) => {
        lines.push(styles.subheaders(`${index + 1}. ${dPackage}`))
        lines.push(
          `- **Version:** \`${currentVersion || 'unknown'} -> ${
            newVersion || 'unknown'
          }\``,
        )
        lines.push(formatBulletList(breaking, styles.breaking))
        if (notes) {
          lines.push(`- **Additional Notes:** ${styles.neutral(notes)}`)
        }
        lines.push('\n')
      },
    )
  }

  // Writing the Report
  try {
    const reportPath = path.resolve(outputPath)
    fs.writeFileSync(reportPath, lines.join('\n'), 'utf8')
    console.log(
      styles.success(`Breaking changes report generated at: ${reportPath}`),
    )
  } catch (err) {
    console.error(
      styles.error(`Failed to write breaking changes report: ${err.message}`),
    )
  }
}
