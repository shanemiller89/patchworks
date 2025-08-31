// analysis/computeTFIDFRanking.js

import { Corpus } from 'tiny-tfidf'
import logger from '../reports/logger.js'

const DEFAULT_STOPWORDS = new Set([
  'the',
  'and',
  'is',
  'in',
  'to',
  'of',
  'for',
  'with',
  'on',
  'at',
  'by',
  'an',
  'it',
  'as',
  'be',
  'from',
  'or',
  'this',
  'that',
  'which',
  'was',
  'are',
  'these',
  'those',
  'can',
  'will',
  'a',
])

/**
 * Preprocess document text (e.g., normalize, remove unnecessary characters).
 * @param {string} text - Raw document text.
 * @returns {string} - Cleaned and normalized text.
 */
function preprocessDocument(text) {
  if (!text || typeof text !== 'string') return ''
  return text
    .replace(/https?:\/\/\S+/g, '') // Remove URLs
    .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
    .trim()
    .toLowerCase() // Normalize case
}

/**
 * Check if a term is not a stopword.
 * @param {string} term - The term to check.
 * @param {Set} stopwords - Set of stopwords.
 * @returns {boolean} - Whether the term is not a stopword.
 */
function isNotStopword(term, stopwords = DEFAULT_STOPWORDS) {
  return !stopwords.has(term)
}

/**
 * Compute TF-IDF rankings for combined content.
 * @param {Object} parsedSections - Sections parsed from release notes.
 * @param {Object} options - Additional options for TF-IDF computation.
 * @returns {Array} - Ranked terms for the entire document.
 */
export function computeTFIDFRankings(parsedSections, options = {}) {
  const { stopwords = DEFAULT_STOPWORDS, termLimit = 10 } = options

  logger.debug(
    `Compute TF-IDF - Parsed sections: ${JSON.stringify(
      parsedSections,
      null,
      2,
    )}`,
  )

  // Combine all sections into a single document
  const combinedDocument = Object.values(parsedSections)
    .flat(Infinity) // Flatten nested structures
    .map((item) => (typeof item === 'string' ? item : item.text || '')) // Extract text from objects
    .map(preprocessDocument) // Preprocess text
    .join(' ')

  logger.debug(`Combined document: ${combinedDocument}`)

  // Initialize the Corpus with a single document
  const corpus = new Corpus(['combined'], [combinedDocument], true, [
    ...stopwords,
  ])

  // Compute TF-IDF rankings
  const vector = corpus.getDocumentVector('combined')
  if (!vector) {
    logger.warn('No vector generated for the combined document.')
    return []
  }

  const rankings = Array.from(vector.entries())
    .filter(([term]) => isNotStopword(term, stopwords)) // Exclude stopwords
    .map(([term, score]) => ({ term, score: parseFloat(score.toFixed(4)) })) // Format terms and scores
    .sort((a, b) => b.score - a.score) // Sort by descending score
    .slice(0, termLimit) // Limit to top terms

  logger.debug(`TF-IDF Rankings: ${JSON.stringify(rankings, null, 2)}`)
  return rankings
}
