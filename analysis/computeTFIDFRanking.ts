// analysis/computeTFIDFRanking.ts

import { Corpus } from 'tiny-tfidf';
import logger from '../reports/logger.js';

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
]);

interface TFIDFOptions {
  stopwords?: Set<string>;
  termLimit?: number;
}

interface TFIDFRanking {
  term: string;
  score: number;
}

type ParsedSections = Record<string, any>;

/**
 * Preprocess document text (e.g., normalize, remove unnecessary characters).
 * @param text - Raw document text.
 * @returns Cleaned and normalized text.
 */
function preprocessDocument(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/https?:\/\/\S+/g, '') // Remove URLs
    .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
    .trim()
    .toLowerCase(); // Normalize case
}

/**
 * Check if a term is not a stopword.
 * @param term - The term to check.
 * @param stopwords - Set of stopwords.
 * @returns Whether the term is not a stopword.
 */
function isNotStopword(term: string, stopwords: Set<string> = DEFAULT_STOPWORDS): boolean {
  return !stopwords.has(term);
}

/**
 * Compute TF-IDF rankings for combined content.
 * @param parsedSections - Sections parsed from release notes.
 * @param options - Additional options for TF-IDF computation.
 * @returns Ranked terms for the entire document.
 */
export function computeTFIDFRankings(
  parsedSections: ParsedSections,
  options: TFIDFOptions = {}
): TFIDFRanking[] {
  const { stopwords = DEFAULT_STOPWORDS, termLimit = 10 } = options;

  logger.debug(
    `Compute TF-IDF - Parsed sections: ${JSON.stringify(parsedSections, null, 2)}`
  );

  // Combine all sections into a single document using more efficient approach
  const textParts: string[] = [];
  
  for (const items of Object.values(parsedSections)) {
    if (Array.isArray(items)) {
      for (const item of items) {
        if (typeof item === 'string') {
          const processed = preprocessDocument(item);
          if (processed) textParts.push(processed);
        } else if (item?.text) {
          const processed = preprocessDocument(item.text);
          if (processed) textParts.push(processed);
        }
      }
    }
  }
  
  const combinedDocument = textParts.join(' ');

  logger.debug(`Combined document: ${combinedDocument.slice(0, 200)}...`);

  // Early return if document is empty
  if (!combinedDocument.trim()) {
    logger.warn('Empty combined document, skipping TF-IDF computation.');
    return [];
  }

  // Initialize the Corpus with a single document
  const corpus = new Corpus(['combined'], [combinedDocument], true, [...stopwords]);

  // Compute TF-IDF rankings
  const vector = corpus.getDocumentVector('combined');
  if (!vector) {
    logger.warn('No vector generated for the combined document.');
    return [];
  }

  const rankings = Array.from(vector.entries())
    .filter(([term]) => isNotStopword(term, stopwords)) // Exclude stopwords
    .map(([term, score]) => ({ term, score: parseFloat(score.toFixed(4)) })) // Format terms and scores
    .sort((a, b) => b.score - a.score) // Sort by descending score
    .slice(0, termLimit); // Limit to top terms

  logger.debug(`TF-IDF Rankings: ${JSON.stringify(rankings, null, 2)}`);
  return rankings;
}
