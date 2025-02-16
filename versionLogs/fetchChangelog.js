// versionLogs/fetchChangelog.js

import axios from 'axios'
// eslint-disable-next-line lodash/import-scope
import tar from 'tar-stream'
import logger from '../reports/logger.js'
import { gunzipSync } from 'zlib'

/**
 * Fetch changelog from Unpkg or tarball locations.
 * Attempts to retrieve a changelog from Unpkg first, then falls back to tarball extraction.
 * @param {string} packageName - The name of the package.
 * @param {Object} metadata - The metadata object containing URLs and version information.
 * @returns {Promise<string|null>} The extracted changelog content or null if not found.
 */
export async function fetchChangelog({ packageName, metadata }) {
  const { dist, current, latest } = metadata
  const version = latest
  const tarballUrl = dist.tarball

  logger.debug(
    `Fallback A Begin: ${packageName}: ${current} -> ${version} - ${tarballUrl}`,
  )

  try {
    const possiblePaths = [
      'CHANGELOG.md',
      'HISTORY.md',
      'docs/CHANGELOG.md',
      'docs/HISTORY.md',
      'changelog.md',
      'history.md',
      'CHANGELOG.txt',
      'HISTORY.txt',
      'changelog.txt',
      'history.txt',
      'changelog/index.md',
      'history/index.md',
      'ReleaseNotes.md',
      'CHANGES.md',
    ]

    // Attempt to fetch changelog from Unpkg
    for (const path of possiblePaths) {
      const unpkgUrl = `https://unpkg.com/${packageName}@${version}/${path}`
      logger.debug(`Attempting to fetch changelog from Unpkg: ${unpkgUrl}`)

      try {
        const unpkgResponse = await axios.get(unpkgUrl)
        if (unpkgResponse.status === 200) {
          const changelogContent = unpkgResponse.data
          logger.success(
            `Changelog successfully fetched from Unpkg: ${unpkgUrl}`,
          )
          return changelogContent
        }
      } catch (unpkgError) {
        logger.warn(`Error fetching from Unpkg: ${unpkgError.message}`)
      }
    }

    // Fallback to tarball extraction
    if (tarballUrl) {
      logger.debug(`Attempting to fetch tarball from: ${tarballUrl}`)

      try {
        const tarballResponse = await axios.get(tarballUrl, {
          responseType: 'arraybuffer',
        })
        if (tarballResponse.status !== 200) {
          logger.warn(`Failed to fetch tarball: ${tarballResponse.statusText}`)
          return null
        }

        const tarballBuffer = Buffer.from(tarballResponse.data)
        const changelogContent = await extractChangelogFromTarball(
          tarballBuffer,
        )

        if (changelogContent) {
          logger.success(`Changelog extracted successfully from tarball.`)
          return changelogContent
        } else {
          logger.warn('No changelog file found in tarball.')
        }
      } catch (tarballError) {
        logger.error(
          `Failed to fetch or extract tarball: ${tarballError.message}`,
        )
      }
    } else {
      logger.warn('No tarball URL provided or tarball fetch failed.')
    }

    return null
  } catch (error) {
    logger.error(`Unexpected error while fetching changelog: ${error.message}`)
    return null
  }
}

/**
 * Extracts the changelog content from a tarball buffer.
 * @param {Buffer} tarballBuffer - The tarball buffer to extract from.
 * @returns {Promise<string|null>} The content of the changelog file or null if not found.
 */
async function extractChangelogFromTarball(tarballBuffer) {
  try {
    const extract = tar.extract()
    const gunzippedBuffer = gunzipSync(tarballBuffer)
    const changelogFiles = [
      'CHANGELOG.md',
      'HISTORY.md',
      'docs/CHANGELOG.md',
      'docs/HISTORY.md',
      'changelog.md',
      'history.md',
      'CHANGELOG.txt',
      'HISTORY.txt',
      'changelog.txt',
      'history.txt',
      'changelog/index.md',
      'history/index.md',
      'ReleaseNotes.md',
      'CHANGES.md',
    ]

    return new Promise((resolve, reject) => {
      let changelogContent = null

      extract.on('entry', (header, stream, next) => {
        logger.debug(`Processing tarball entry: ${header.name}`)
        if (changelogFiles.includes(header.name)) {
          const chunks = []
          stream.on('data', (chunk) => chunks.push(chunk))
          stream.on('end', () => {
            changelogContent = Buffer.concat(chunks).toString('utf-8')
            resolve(changelogContent)
          })
        } else {
          stream.resume()
        }
        next()
      })

      extract.on('finish', () => {
        resolve(changelogContent || null)
      })

      extract.on('error', (err) => {
        reject(`Extraction error: ${err.message}`)
      })

      extract.end(gunzippedBuffer)
    })
  } catch (error) {
    logger.error(`Error extracting changelog from tarball: ${error.message}`)
    return null
  }
}
