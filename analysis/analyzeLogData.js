// analysis/analyzeLogData.js

import * as cheerio from 'cheerio'
import _ from 'lodash'
import MarkdownIt from 'markdown-it'
import markdownItContainer from 'markdown-it-container'
import markdownItTaskLists from 'markdown-it-task-lists'
import sanitizeHtml from 'sanitize-html'
import logger from '../reports/logger.js'
import { ALL, CHANGELOG, RELEASE_NOTES, UNKNOWN } from '../utils/constants.js'
import { analyzeLogCategorization } from './categorizeLogs.js'
import { computeTFIDFRankings } from './computeTFIDFRanking.js'

/**
 * Parse markdown notes into structured HTML for easier traversal.
 * Handles GitHub-flavored markdown and malformed markdown by returning raw text as fallback.
 * @param {string} markdownContent
 * @returns {Object} HTML content and extracted metadata or raw text if conversion fails
 */
function convertMarkdownToHTML(markdownContent) {
  logger.debug(
    `Convert Markdown to HTML - content snippet: ${markdownContent.slice(
      0,
      100,
    )}`,
  )

  try {
    const md = new MarkdownIt({
      html: true,
      linkify: true,
    })
      .use(markdownItTaskLists)
      .use(markdownItContainer, 'note')

    let htmlContent = md.render(markdownContent)

    // Sanitize the HTML content
    htmlContent = sanitizeHtml(htmlContent)

    // Extract metadata
    const metadata = {
      references: [],
      mentions: [],
      urls: [],
    }

    // Extract issue or PR references
    const referencePattern = /\b(?:#\d+|PR\s?#?\d+)\b/g
    const matches = markdownContent.match(referencePattern)
    if (matches) {
      metadata.references = new Set(matches)
    }

    // Extract GitHub mentions (@username)
    const mentionPattern = /@\w{1,39}\b/g
    const mentions = markdownContent.match(mentionPattern)
    if (mentions) {
      metadata.mentions = new Set(mentions)
    }

    // Extract URLs
    const urlPattern =
      /\bhttps?:\/\/[^\s()<>]+(?:\([\w\d]+\)|([^[:punct:]\s]|\/))/g
    const urls = markdownContent.match(urlPattern)
    if (urls) {
      metadata.urls = new Set(urls)
    }

    return { htmlContent, metadata }
  } catch (error) {
    logger.warn('Failed to parse markdown, returning raw content:', error)
    return {
      htmlContent: markdownContent,
      metadata: { references: [], mentions: [], urls: [] },
    }
  }
}

/**
 * Extract sections and items from HTML content.
 * Handles hierarchical data to allow deeper nesting.
 * Includes tables, task lists, and inline/mixed content parsing.
 * @param {string} htmlContent
 * @returns {Object} Parsed sections with items
 */
function parseHTML(htmlContent) {
  logger.debug(`Parse HTML - content snippet: ${htmlContent.slice(0, 100)}`)

  if (!htmlContent || typeof htmlContent !== 'string') {
    logger.warn('Invalid or empty HTML content passed to parseHTML.')
    return {}
  }

  const $ = cheerio.load(htmlContent, { xmlMode: true })
  const sections = {}

  /**
   * Parses a list element and returns a structured representation of its items.
   * Handles nested lists by recursively parsing them.
   * @param {Object} element - The list element to parse.
   * @returns {Array} An array of list items, each with text and optional children.
   */
  function parseList(element) {
    return $(element)
      .find('li')
      .map((_, li) => {
        const nestedList = $(li).find('ul, ol')
        const inlineText = $(li).contents().not('ul, ol').text().trim()
        if (nestedList.length > 0) {
          return {
            text: inlineText,
            children: parseList(nestedList), // Recursively parse nested lists
          }
        } else {
          return { text: inlineText }
        }
      })
      .get()
  }

  $('h1, h2, h3, h4, h5, h6').each((_, element) => {
    const heading = $(element).text().trim()

    const items = $(element)
      .nextUntil(
        'h1, h2, h3, h4, h5, h6',
        'ul, ol, table, code, pre, p, span, b, i',
      )
      .map((_, elem) => {
        if ($(elem).is('ul, ol')) {
          return parseList(elem)
        } else if ($(elem).is('table')) {
          return $(elem)
            .find('tr')
            .map((_, row) =>
              $(row)
                .find('td, th')
                .map((_, cell) => $(cell).text().trim())
                .get(),
            )
            .get()
        } else {
          return $(elem).text().trim() // Inline and mixed content
        }
      })
      .get()

    // Fallback: Add heading with raw content if no items are found
    if (items.length === 0) {
      items.push($(element).next().text().trim())
    }

    sections[heading] = sections[heading] || []
    sections[heading].push(...items.flat())
  })

  logger.debug(`Parsed sections: ${JSON.stringify(sections, null, 2)}`)
  return sections
}

/**
 * Parse notes and generate output for a single included package.
 * Appends importantTerms and categorizedNotes while preserving existing keys.
 * @param {Object} pkg - A single included package
 * @returns {Promise<Object>} - A Promise resolving with importantTerms and categorizedNotes
 */
export async function parseIncludedPackage(pkg) {
  const { releaseNotes, changelog, packageName } = pkg

  try {
    logger.debug(`Release Notes: ${typeof releaseNotes}`)
    logger.debug(`changelog: ${typeof changelog}`)

    // Debug the starting context
    logger.debug(
      `Parsing package: ${packageName} with releaseNotes: ${!_.isEmpty(
        releaseNotes,
      )}, changelog: ${!!changelog}`,
    )

    const notes =
      _.isEmpty(releaseNotes) ||
      releaseNotes == UNKNOWN ||
      releaseNotes == 'SKIPPED'
        ? [{ notes: changelog, version: ALL }]
        : releaseNotes

    const logSource = _.isEmpty(releaseNotes) ? CHANGELOG : RELEASE_NOTES

    // Handle releaseNotes path
    if (!_.isEmpty(notes)) {
      logger.debug(`${packageName}: Using ${logSource} for parsing`)

      const importantTerms = []
      const categorizedNotes = []

      notes.forEach((note) => {
        try {
          const { htmlContent, metadata } = convertMarkdownToHTML(note.notes)
          logger.debug(
            `${packageName} [${
              note.version
            }]: Markdown converted to HTML with metadata: ${JSON.stringify(
              metadata,
            )}`,
          )

          const parsedSections = parseHTML(htmlContent)
          logger.debug(
            `${packageName} [${
              note.version
            }]: Parsed HTML sections: ${JSON.stringify(
              parsedSections,
              null,
              2,
            )}`,
          )

          const tfidfResults = computeTFIDFRankings(parsedSections)
          logger.debug(
            `${packageName} [${
              note.version
            }]: Computed TF-IDF rankings: ${JSON.stringify(
              tfidfResults,
              null,
              2,
            )}`,
          )

          const compromiseResults = analyzeLogCategorization(parsedSections)
          logger.debug(
            `${packageName} [${
              note.version
            }]: Compromise analysis results: ${JSON.stringify(
              compromiseResults,
              null,
              2,
            )}`,
          )

          importantTerms.push({
            version: note.version || UNKNOWN,
            published_at: note.published_at || UNKNOWN,
            terms: tfidfResults,
          })

          categorizedNotes.push({
            version: note.version || UNKNOWN,
            published_at: note.published_at || UNKNOWN,
            categorized: compromiseResults,
            logMetadata: metadata,
            logSource: logSource,
          })
        } catch (error) {
          logger.error(
            `${packageName} [${note.version}]: Error processing ${logSource} - ${error.message}`,
          )
        }
      })

      return Promise.resolve({
        importantTerms,
        categorizedNotes,
      })
    }

    // No logs to parse
    logger.debug(`${packageName}: No logs to parse, skipping parsing.`)
    return Promise.resolve({
      logSource: UNKNOWN,
      importantTerms: null,
      categorizedNotes: null,
    })
  } catch (error) {
    logger.error(`${packageName}: Error during parsing - ${error.message}`)
    return Promise.reject(error)
  }
}
