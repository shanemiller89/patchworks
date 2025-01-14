// releaseLogs/fetchReleaseNotes.js

import { Octokit } from '@octokit/rest'
import _ from 'lodash'
import semver from 'semver'
import logger from '../reports/logger.js'

/**
 * Fetch release notes from GitHub or fallback URL.
 * Fetches release notes for versions newer than the current version up to the latest.
 * @param {Object} packageData - The package object containing metadata.
 * @param {string} packageData.packageName - The name of the package.
 * @param {Object} packageData.metadata - The metadata object containing URLs and version information.
 * @returns {Promise<Object>} Object containing package name, release notes, and metadata.
 */
export async function fetchReleaseNotes({ packageName, metadata }) {
  const { githubUrl, fallbackUrl, current, latest } = metadata
  const octokit = new Octokit()
  logger.debug(`${packageName} - ${githubUrl}`)

  try {
    const releaseNotes = []

    // Attempt to fetch release notes using GitHub URL
    if (githubUrl) {
      logger.debug(
        `Attempting to fetch release notes from GitHub for package: ${packageName}`,
      )
      const match = githubUrl.match(/github\.com\/(.*?)\/(.*?)(\.git|$)/)
      if (!match) {
        logger.warn(`Invalid GitHub URL for ${packageName}: ${githubUrl}`)
      } else {
        const [, owner, repo] = match
        logger.info(`Fetching release notes for ${owner}/${repo}`)

        try {
          // Fetch all releases
          const { data: releases } = await octokit.repos.listReleases({
            owner,
            repo,
          })

          logger.debug(
            `Raw releases data: ${JSON.stringify(releases, null, 2)}`,
          )

          if (releases.length === 0) {
            logger.warn(
              `No releases found for GitHub repository: ${owner}/${repo}`,
            )
          } else {
            for (const release of releases) {
              try {
                const releaseVersion = release.tag_name.replace(/^v/, '') // Strip 'v' prefix if present
                logger.debug(`Processing release: ${releaseVersion}`)

                if (
                  semver.valid(releaseVersion) &&
                  semver.gt(releaseVersion, current) &&
                  semver.lte(releaseVersion, latest)
                ) {
                  logger.debug(`Including release: ${releaseVersion}`)
                  releaseNotes.push({
                    version: releaseVersion,
                    published_at: release.published_at || null,
                    notes: release.body || 'No release notes available.',
                  })
                } else {
                  logger.debug(
                    `Skipping release: ${releaseVersion} (not in range: current ${current} to latest ${latest})`,
                  )
                }
              } catch (versionError) {
                logger.error(
                  `Error processing release version: ${versionError.message}`,
                )
              }
            }

            logger.success(
              `Fetched ${releaseNotes.length} release notes newer than ${current} up to ${latest} for ${owner}/${repo}`,
            )
          }
        } catch (githubError) {
          logger.debug(
            `GitHub API error response: ${JSON.stringify(
              githubError,
              null,
              2,
            )}`,
          )
          if (githubError.status === 404) {
            logger.warn(
              `No releases found for GitHub repository: ${owner}/${repo}`,
            )
          } else {
            logger.error(
              `GitHub API error for ${owner}/${repo}: ${githubError.message}`,
            )
          }
        }
      }
    } else {
      logger.warn(`GitHub URL not provided for package: ${packageName}`)
    }

    // Attempt fallback URL if no release notes were found
    if (releaseNotes.length === 0 && fallbackUrl) {
      logger.debug(
        `Attempting to fetch release notes from fallback URL for package: ${packageName} - Fallback URL: ${fallbackUrl}`,
      )
      logger.fallback(
        `Attempting to fetch release notes from fallback URL for package: ${packageName}`,
      )
      try {
        // Normalize fallback URL to strip trailing paths like /bugs or /issues
        const baseFallbackUrl = fallbackUrl.replace(/(\/[^\/]+)*$/, '')
        const fallbackResponse = await fetch(`${baseFallbackUrl}/releases.json`)

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json()
          logger.debug(
            `Fallback data: ${JSON.stringify(fallbackData, null, 2)}`,
          )

          for (const fallbackRelease of fallbackData.releases || []) {
            const fallbackVersion = fallbackRelease.version.replace(/^v/, '')
            if (
              semver.valid(fallbackVersion) &&
              semver.gt(fallbackVersion, current) &&
              semver.lte(fallbackVersion, latest)
            ) {
              releaseNotes.push({
                version: fallbackVersion,
                published_at: fallbackRelease.published_at || null,
                notes: fallbackRelease.notes || 'No release notes available.',
              })
            }
          }
        } else {
          logger.warn(
            `Fallback fetch failed with status ${fallbackResponse.status} for URL: ${baseFallbackUrl}/releases.json`,
          )
        }
      } catch (fallbackError) {
        logger.error(
          `Error attempting fallback fetch for package ${packageName}: ${fallbackError.message}`,
        )
      }
    }

    if (releaseNotes.length === 0) {
      logger.warn(`No release notes found for package: ${packageName}`)
    }

    return _.isEmpty(releaseNotes) ? null : releaseNotes
  } catch (error) {
    logger.debug(`Unexpected error response: ${JSON.stringify(error, null, 2)}`)
    logger.error(
      `Unexpected error while fetching release notes for ${packageName}: ${error.message}`,
    )
    return null
  }
}
