import logger from './logger.js'
import { styles } from './styles.js'

/**
 * Displays a console summary of updated and skipped packages.
 * @param {Object} filteredPackages - The packages that were updated.
 * @param {Array<Object>} skippedPackages - The packages that were skipped.
 * @param {boolean} showSkipped - Whether to display skipped packages.
 * @param {boolean} isSummary - Whether to show a summary (yes/no) or detailed report.
 */

const base = ({ pkg, current, version, type }) =>
  `${styles.headers(pkg)}\n ${styles.warning(current)} -> ${styles.success(
    version,
  )}\n Type: ${styles.neutral(type)}`

export function consoleSummaryReport(
  filteredPackages,
  skippedPackages,
  showSkipped,
  isSummary,
) {
  logger.heading('Console Summary Report')

  // Group packages by jump type
  const groupedByType = {
    major: [],
    minor: [],
    patch: [],
  }

  Object.entries(filteredPackages).forEach(([pkg, details]) => {
    const { type, breaking, notes, current, version } = details
    groupedByType[type].push({
      pkg,
      current,
      version,
      type,
      breaking: breaking.length > 0 ? breaking : null,
      notes: notes || null,
    })
  })

  // Generate summary or detailed output
  ;['major', 'minor', 'patch'].forEach((type) => {
    if (groupedByType[type].length > 0) {
      console.log(
        styles.headers(
          `${type.charAt(0).toUpperCase() + type.slice(1)} Updates:`,
        ),
      )
      groupedByType[type].forEach(
        ({ pkg, current, version, breaking, notes }) => {
          const baseReport = base({ pkg, current, version, type })

          if (isSummary) {
            console.log(
              `${baseReport} \n Breaking Changes: ${
                breaking ? styles.neutral('yes') : styles.warning('no')
              }`,
            )
          } else {
            console.log(`${baseReport}`)
            if (breaking) {
              console.log(
                `  Breaking Changes:\n${breaking
                  .map((bc) => `    - ${styles.breaking(bc)}`)
                  .join('\n')}`,
              )
            } else {
              console.log(`  Breaking Changes: ${styles.warning('None')}`)
            }
            if (notes) {
              const truncatedNotes = notes.split('\n').slice(0, 3).join('\n') // Show first 3 lines of notes
              console.log(
                `  Release Notes Preview:\n${styles.neutral(
                  truncatedNotes,
                )}\n    ...`,
              )
            } else {
              console.log(`  Release Notes: ${styles.warning('None')}`)
            }
          }
        },
      )
    }
  })

  if (Object.values(groupedByType).flat().length === 0) {
    console.log(styles.warning('No packages updated.'))
  }

  // Show skipped packages if the flag is enabled
  if (showSkipped && skippedPackages.length > 0) {
    console.log(styles.headers('Skipped Packages:'))
    skippedPackages.forEach(({ pkg, reason }) => {
      console.log(`- ${pkg}: ${styles.warning(reason)}`)
    })
  } else if (showSkipped && skippedPackages.length === 0) {
    console.log(styles.success('No packages skipped.'))
  }
}

// import { styles } from './styles.js'
// import logger from './logger.js'

// /**
//  * Displays a console summary of updated and skipped packages.
//  * @param {Object} filteredPackages - The packages that were updated.
//  * @param {Array<Object>} skippedPackages - The packages that were skipped.
//  * @param {boolean} showSkipped - Whether to display skipped packages.
//  * @param {boolean} isSummary - Whether to show a summary (yes/no) or detailed report.
//  */
// export function consoleSummaryReport(
//   filteredPackages,
//   skippedPackages,
//   showSkipped,
//   isSummary,
// ) {
//   logger.heading('Console Summary Report')

//   // Group packages by jump type
//   const groupedByType = {
//     major: [],
//     minor: [],
//     patch: [],
//   }

//   Object.entries(filteredPackages).forEach(([pkg, details]) => {
//     const { type, breaking, notes } = details
//     groupedByType[type].push({
//       pkg,
//       breaking: breaking.length > 0 ? 'yes' : 'no',
//       notes: notes ? 'yes' : 'no',
//     })
//   })

//   // Generate summary or detailed output
//   ;['major', 'minor', 'patch'].forEach((type) => {
//     if (groupedByType[type].length > 0) {
//       console.log(
//         styles.headers(
//           `${type.charAt(0).toUpperCase() + type.slice(1)} Updates:`,
//         ),
//       )
//       groupedByType[type].forEach(({ pkg, breaking, notes }) => {
//         if (isSummary) {
//           console.log(`- ${pkg}: Breaking Changes: ${styles.neutral(breaking)}`)
//         } else {
//           console.log(
//             `- ${pkg}: Breaking Changes: ${styles.neutral(
//               breaking,
//             )}, Release Notes: ${styles.neutral(notes)}`,
//           )
//         }
//       })
//     }
//   })

//   if (Object.values(groupedByType).flat().length === 0) {
//     console.log(styles.warning('No packages updated.'))
//   }

//   // Show skipped packages if the flag is enabled
//   if (showSkipped && skippedPackages.length > 0) {
//     console.log(styles.headers('Skipped Packages:'))
//     skippedPackages.forEach(({ pkg, reason }) => {
//       console.log(`- ${pkg}: ${styles.warning(reason)}`)
//     })
//   } else if (showSkipped && skippedPackages.length === 0) {
//     console.log(styles.success('No packages skipped.'))
//   }
// }
