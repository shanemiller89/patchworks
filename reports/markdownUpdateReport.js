// // reports/markdownUpdateReport.js
// import { extractBreakingChanges } from '../utils/breakingChangesProcessor.js'
// import { formatBulletList, styles } from './styles.js'
// import fs from 'fs'
// import path from 'path'
// /**
//  * Generates a Markdown update report summarizing updates, including breaking changes and release notes.
//  * @param {Object} filteredPackages - Processed package update information.
//  * @param {string} outputPath - (Optional) Path to save the Markdown report.
//  */
// export function markdownUpdateReport(
//   filteredPackages,
//   outputPath = 'update-report.md',
// ) {
//   const lines = []
//   const breakingChanges = extractBreakingChanges(filteredPackages)

//   // Header Section
//   lines.push(styles.headers('# Update Report'))
//   lines.push(`Generated on: ${new Date().toLocaleString()}`)
//   lines.push('\n---\n')

//   // Summary Section
//   lines.push(styles.subheaders('## Summary'))
//   lines.push(
//     `- **Total Packages Updated:** ${Object.keys(filteredPackages).length}`,
//   )
//   lines.push(`- **Major Updates:** ${breakingChanges.length}`)
//   lines.push('\n---\n')

//   // Detailed Updates Section
//   lines.push(styles.subheaders('## Package Updates'))

//   Object.entries(filteredPackages).forEach(([pkg, info]) => {
//     lines.push(`### ${pkg}`)
//     lines.push(`- **Current Version:** ${info.current || 'unknown'}`)
//     lines.push(`- **New Version:** ${info.version || 'unknown'}`)
//     lines.push(`- **Update Type:** ${info.type || 'unknown'}`)
//     if (info.notes) {
//       lines.push(`- **Release Notes:** ${info.notes}`)
//     }
//     if (info.breaking && info.breaking.length > 0) {
//       lines.push(styles.warning('- **Breaking Changes:**'))
//       lines.push(formatBulletList(info.breaking, styles.breaking))
//     }
//     lines.push('\n')
//   })

//   // Writing the Report
//   try {
//     const reportPath = path.resolve(outputPath)
//     fs.writeFileSync(reportPath, lines.join('\n'), 'utf8')
//     console.log(styles.success(`Update report generated at: ${reportPath}`))
//   } catch (err) {
//     console.error(styles.error(`Failed to write update report: ${err.message}`))
//   }
// }
