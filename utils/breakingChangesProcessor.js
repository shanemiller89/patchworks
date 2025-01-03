// utils/breakingChangesProcessor.js
/**
 * Extracts breaking change information from filtered packages.
 * @param {Object} filteredPackages - Outdated packages with metadata.
 * @returns {Array<Object>} Structured breaking change data.
 */
export function extractBreakingChanges(filteredPackages) {
  if (!filteredPackages || typeof filteredPackages !== 'object') {
    console.error('Invalid input: filteredPackages must be a non-null object.')
    return []
  }

  return Object.entries(filteredPackages)
    .filter(([pkg, info]) => {
      if (!info || typeof info !== 'object') {
        console.warn(`Skipping ${pkg}: Missing or malformed package info.`)
        return false
      }
      if (!Array.isArray(info.breaking)) {
        console.warn(`Skipping ${pkg}: Breaking changes should be an array.`)
        return false
      }
      return info.breaking.length > 0
    })
    .map(([pkg, info]) => ({
      package: pkg,
      currentVersion: info.current || 'unknown',
      newVersion: info.version || 'unknown',
      breaking: info.breaking,
      notes: info.notes || null,
    }))
}
