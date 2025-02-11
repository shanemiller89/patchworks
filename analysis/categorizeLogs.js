// analyze/categorizeLogs.js

import nlp from 'compromise'
import logger from '../reports/logger.js'

const BREAKING_CHANGES = 'breaking_change'
const FEATURES = 'feature'
const FIXES = 'fix'
const DEPRECATIONS = 'deprecation'
const SECURITY = 'security'
const DOCUMENTATION = 'documentation'
const PERFORMANCE = 'performance'
const REFACTORS = 'refactor'
const CHORES = 'chore'

const releaseNotePlugin = {
  // Add Category tag for category matching
  tags: {
    Category: {
      isA: ['Noun', 'Verb'],
    },
    BreakingChange: {
      isA: ['Noun', 'Verb'],
    },
  },

  words: {
    'breaking changes': ['Category', 'BreakingChange'],
    [BREAKING_CHANGES]: ['Category', 'BreakingChange'],
    [FEATURES]: 'Category',
    [FIXES]: 'Category',
    [DEPRECATIONS]: 'Category',
    [SECURITY]: 'Category',
    [DOCUMENTATION]: 'Category',
    [PERFORMANCE]: 'Category',
    [REFACTORS]: 'Category',
    [CHORES]: 'Category',
  },

  api: (View) => {
    View.prototype.hasCategory = function (category, options = {}) {
      const categoryWord = category.replace(/_/g, ' ') // Normalize category query

      if (options.fuzzy) {
        const fuzzyMatched = this.match(`~${categoryWord}~`, null, {
          fuzzy: options.fuzzy,
        }).found

        return fuzzyMatched
      }
      // Perform exact matching
      const matched = this.match(categoryWord).found

      return matched
    }

    // // Reference the original normalize method
    // const originalNormalize = View.prototype.normalize

    // // Add snake_case normalization to the existing normalize method
    // View.prototype.normalize = function (options = {}) {
    //   if (options.snakeCase) {
    //     this.match(/([a-z]+)_([a-z]+)/gi).forEach((match) => {
    //       const snakeCase = match.text()
    //       const normalized = snakeCase.replace(/_/g, ' ') // Convert to space-separated
    //       match.replaceWith(normalized)
    //     })
    //   }
    //   return originalNormalize.call(this, options) // Call original normalize
    // }
  },

  // Extend existing methods
  // extend: (Doc, world) => {},
}

nlp.plugin(releaseNotePlugin)

const categoryPatterns = {
  [BREAKING_CHANGES]: [
    'breaking #Verb',
    'breaking change',
    'breaking_change',
    'Breaking Changes',
    'no longer supports',
    'requires migration',
    'incompatible',
    'remove #Noun',
    'legacy #Adjective removed',
    'critical update',
    'must migrate',
    'discontinued',
    'significant alteration',
    'breaking change',
    'removed #Noun',
    'rempoved deprecated #Noun',
    'remove deprecated',
    'no longer supports #Noun',
    'requires migration',
    'removed support for #Noun',
    'must migrate',
    'incompatible with #Noun',
    'discontinued',
    'critical breaking change',
    'legacy code issue',
    'significant code alteration',
  ],
  [FEATURES]: [
    'added',
    'add',
    'add #Noun',
    'feat',
    'new feature',
    'introduced',
    'support for',
    'enhanced',
    'improved',
    'upgrade',
    'performance',
    'optimized',
    'capability',
    'enhancement',
    'added support for #Noun',
    'introduced #Noun',
    'enhanced #Noun',
    'improved #Noun',
    'new feature: #Noun',
    'performance improvement',
    'added functionality to #Noun',
    'enabled #Noun',
    'brought #Noun to production',
    '#Noun can now run',
  ],
  [FIXES]: [
    'fix',
    'resolved',
    'corrected',
    'patched',
    'bugfix',
    'issue',
    'addressed',
    'fixed',
    'regression',
    'patched',
    'fix: #Noun',
    'resolved issue',
    'corrected behavior',
    'fixed #Noun',
    'issue with #Noun resolved',
    'bugfix: #Noun',
    'addressed #Noun bug',
    'patched issue with #Noun',
    'resolved regression in #Noun',
  ],
  [DEPRECATIONS]: [
    'deprecated',
    'will be removed',
    'phased out',
    'marked for removal',
    'unsupported',
    'to be removed',
    'obsolete',
    'no longer recommended',
    'deprecated method',
    'flagged obsolete',
    'will be removed',
    'phased out',
    'marked as deprecated',
    'to be removed',
    'no longer recommended',
    'deprecated method',
    'use alternative for #Noun',
    'end of support for #Noun',
    'flagged as obsolete',
    'deprecating soon',
  ],
  [SECURITY]: [
    'patched',
    'fixed security',
    'vulnerability',
    'secured',
    'attack vector',
    'encryption',
    'security flaw',
    'authentication',
    'security update',
    'hardened',
    'patched vulnerability',
    'fixed security issue',
    'enhanced encryption',
    'mitigated attack vector',
    'secured #Noun',
    'addressed security flaw',
    'resolved security issue',
    'hardened against #Noun',
    'improved authentication',
    'applied security update',
  ],
  [DOCUMENTATION]: [
    'updated docs',
    'readme',
    'examples',
    'tutorials',
    'documentation',
    'clarified',
    'expanded docs',
    'instructions',
    'doc navigation',
    'enhanced manual',
    'updated docs',
    'improved examples',
    'added documentation for #Noun',
    'updated README',
    'added tutorials for #Noun',
    'expanded documentation',
    'fixed typo in docs',
    'clarified instructions for #Noun',
    'improved doc navigation',
    'enhanced manual for #Noun',
  ],
  [PERFORMANCE]: [
    'optimized',
    'performance',
    'improved speed',
    'reduced latency',
    'efficiency',
    'boost',
    'enhanced',
    'memory usage',
    'load time',
    'streamlined',
    'optimized #Noun',
    'improved performance',
    'reduced memory usage',
    'enhanced speed',
    'performance boost for #Noun',
    'reduced latency in #Noun',
    'increased efficiency of #Noun',
    'streamlined #Noun processing',
    '#Adjective developer experience',
  ],
  [REFACTORS]: [
    'refactored',
    'cleaned up',
    'restructured',
    'simplified',
    'modularized',
    'readability',
    'redundant',
    'maintainability',
    'modernized',
    'coverage',
    'refactored #Noun',
    'simplified logic',
    'improved code maintainability',
    'restructured #Noun',
    'cleaned up #Noun',
    'removed redundant code',
    'modularized #Noun',
    'improved readability of #Noun',
    'codebase modernization',
    'enhanced test coverage',
  ],
  [CHORES]: [
    'updated dependencies',
    'ci',
    'pipeline',
    'build scripts',
    'upgraded',
    'cleanup',
    'improved build',
    'maintenance',
    'chore',
    'updated dependencies',
    'improved CI',
    'enhanced pipeline',
    'updated build scripts',
    'upgraded #Noun to latest version',
    'cleaned up scripts',
    'improved build process',
    'minor updates for #Noun',
    'chore: maintenance for #Noun',
    'bump #Noun',
  ],
}

// export function sanitizeText(parsedSections) {
//   let cleanedSections = parsedSections

// }

/**
 * Analyzes parsed sections of release notes and categorizes sentences into predefined categories.
 * Uses natural language processing to match sentences to categories.
 * @param {Object} parsedSections - Sections parsed from release notes.
 * @returns {Object} An object containing categorized results.
 */
export function analyzeLogCategorization(parsedSections) {
  logger.debug(
    `Analyze Text - parsedSections: ${JSON.stringify(parsedSections, null, 2)}`,
  )

  const results = {
    [BREAKING_CHANGES]: [],
    [FEATURES]: [],
    [FIXES]: [],
    [DEPRECATIONS]: [],
    [SECURITY]: [],
    [DOCUMENTATION]: [],
    [PERFORMANCE]: [],
    [REFACTORS]: [],
    [CHORES]: [],
    miscellaneous: [], // For unmatched but relevant sentences
    uncategorized: [], // Fallback for truly unmatched content
  }

  // Iterate over each section of parsed release notes
  Object.entries(parsedSections).forEach(([section, items]) => {
    if (!Array.isArray(items) || items.length === 0) {
      logger.warn(`No sentences to analyze in section: ${section}`)
      return
    }

    items.forEach((item) => {
      const sentence = typeof item === 'string' ? item : item.text || ''
      const cleanDoc = nlp(sentence)
        .normalize({
          whitespace: true,
          case: true,
          punctuation: true,
          unicode: true,
          contractions: true,
          acronyms: true,
          plurals: true,
          possessives: true,
          snakeCase: true,
        })
        .cache()
        .out()

      let doc = nlp(cleanDoc)

      const fallbackDoc = nlp(
        `${nlp(section)
          .normalize({
            whitespace: true,
            case: true,
            punctuation: true,
            unicode: true,
            contractions: true,
            plural: true,
            snakeCase: true,
          })
          .remove('#Emoji')
          .cache()
          .text()} - ${doc.text()}`,
      )

      let categorized = false

      // Match sentence against unified category patterns
      Object.entries(categoryPatterns).forEach(([category, patterns]) => {
        patterns.some((pattern) => {
          // BASIC
          if (doc.match(pattern).found) {
            logger.debug(
              `Matched "${sentence}" to category "${category}" via pattern: "${pattern}"`,
            )
            results[category].push(sentence)
            categorized = true
            return true
          }

          // FUZZY
          if (doc.match(`~${pattern}~`, null, { fuzzy: 0.7 }).found) {
            logger.debug(
              `Matched "${sentence}" to category "${category}" via pattern: "${pattern}"`,
            )
            results[category].push(sentence)
            categorized = true
            return true
          }

          if (
            fallbackDoc.match(`~${category}~`, null, { fuzzy: 0.7 }).found ||
            fallbackDoc.match(`~${pattern}~`, null, { fuzzy: 0.7 }).found ||
            fallbackDoc.hasCategory(category, { fuzzy: 0.7 })
          ) {
            logger.debug(
              `Matched "${sentence}" to category "${category}" via pattern: "${pattern}"`,
            )
            results[category].push(sentence)
            categorized = true
            return true
          }

          return false
        })
      })

      // Miscellaneous or uncategorized
      if (!categorized) {
        logger.fallback(
          `The fallback doc (( ${fallbackDoc.text()} )) for section [[ ${section} ]] is being checked.`,
          JSON.stringify(fallbackDoc.out('tags'), null, 2),
        )
        // generic catch all to for ones that def should be
        if (fallbackDoc.has('#Category')) {
          if (fallbackDoc.has('#BreakingChange')) {
            categorized = true
            results[BREAKING_CHANGES].push(fallbackDoc.text())
            return
          }
          Object.keys(categoryPatterns).forEach((category) => {
            const hasCategory = fallbackDoc.hasCategory(category, {
              fuzzy: 0.7,
            })

            if (hasCategory) {
              categorized = true
              results[category].push(sentence)
              return
            } else {
              categorized = true
              results.miscellaneous.push(fallbackDoc.text())
              return
            }
          })
        } else {
          results.uncategorized.push(sentence)
          return
        }

        logger.warn(
          `No matches found for sentence in section "${section}": "${sentence}"`,
        )
      }
    })
  })

  logger.debug(`Final categorized results: ${JSON.stringify(results, null, 2)}`)
  return results
}

// logger.separator()
// logger.separator()
// logger.separator()
// logger.separator()
// logger.separator()
// logger.separator()
// logger.separator()
// nlp.extend((_Doc, world) => {
//   logger.info(`I AM DOC: ${JSON.stringify(_Doc, null, 2)}`)
//   logger.info(`I AM WORLD: ${JSON.stringify(world, null, 2)}`)
//   return
// })
// logger.separator()
// logger.separator()
// logger.separator()
// logger.separator()
// logger.separator()
// logger.separator()
// logger.separator()
// logger.separator()
