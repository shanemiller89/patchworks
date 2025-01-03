// Import required libraries
import { Octokit } from '@octokit/rest'
import conventionalChangelog from 'conventional-changelog'
import { parser } from 'keep-a-changelog'
import semver from 'semver' // Add semver for robust version handling
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

// Initialize Octokit with authentication support
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN, // Use GITHUB_TOKEN from environment variables
})

/**
 * Extracts breaking changes from release notes.
 * @param {string} releaseNotes - Raw release notes text.
 * @returns {Array<string>} A list of breaking changes.
 */
export function extractNotesWithBreakingChanges(releaseNotes) {
  if (typeof releaseNotes !== 'string') {
    console.warn(
      'Invalid release notes content provided to extractNotesWithBreakingChanges.',
    )
    return []
  }

  const breakingChangeKeywords = [
    'breaking change',
    'incompatible',
    'deprecated',
  ]
  const breakingChanges = []
  const lines = releaseNotes.split('\n')

  lines.forEach((line) => {
    if (
      breakingChangeKeywords.some((keyword) =>
        line.toLowerCase().includes(keyword),
      )
    ) {
      breakingChanges.push(line.trim())
    }
  })

  return breakingChanges.length > 0 ? breakingChanges : []
}

/**
 * Parses a local CHANGELOG.md file for release notes.
 * @param {string} pkgPath - Path to the package.
 * @returns {string} Parsed changelog content.
 */
export function parseLocalChangelog(pkgPath) {
  const possiblePaths = [
    'CHANGELOG.md',
    'docs/CHANGELOG.md',
    'changelogs/CHANGELOG.md',
  ]
  for (const changelogPath of possiblePaths.map((p) => path.join(pkgPath, p))) {
    if (fs.existsSync(changelogPath)) {
      try {
        const changelog = parser(fs.readFileSync(changelogPath, 'utf-8'))
        return (
          changelog.getLatestRelease()?.description ||
          'No release notes available.'
        )
      } catch (err) {
        console.error(
          `Error parsing changelog at ${changelogPath}: ${err.message}`,
        )
      }
    }
  }
  return 'No changelog found.'
}

/**
 * Fallback to conventional-changelog for generating release notes.
 * @param {string} pkgPath - Path to the package.
 * @returns {Promise<string>} Generated changelog.
 */
async function generateChangelogFallback(pkgPath) {
  try {
    const changelogStream = conventionalChangelog(
      { preset: 'angular' },
      null,
      null,
      null,
      null,
    )
    let changelog = ''

    for await (const chunk of changelogStream) {
      changelog += chunk
    }

    return changelog
  } catch (err) {
    console.error(
      `Error generating changelog via conventional-changelog: ${err.message}`,
    )
    return 'Failed to generate changelog.'
  }
}

/**
 * Fetches repository metadata from the package.json file.
 * @param {string} packageName - Package name (e.g., @scope/package or package).
 * @returns {Object} Owner and repository extracted from the repository URL.
 */
function getRepoFromPackageJson(packageName) {
  try {
    const packageInfo = JSON.parse(
      execSync(`npm view ${packageName} --json`).toString(),
    )
    const repoUrl = packageInfo.repository?.url || ''
    const match = repoUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)/)
    if (match) {
      return { owner: match[1], repo: match[2] }
    }
  } catch (err) {
    console.warn(
      `Failed to fetch package.json metadata for ${packageName}: ${err.message}`,
    )
  }
  return null
}

/**
 * Fetches release notes from GitHub using Octokit.
 * @param {string} packageName - Package name (e.g., @scope/package or package).
 * @param {string} currentVersion - Current version.
 * @param {string} targetVersion - Target version.
 * @returns {Promise<Object>} Release notes and breaking changes.
 */
export async function fetchReleaseNotes(
  packageName,
  currentVersion,
  targetVersion,
) {
  console.debug(
    `fetchReleaseNotes called with packageName=${packageName}, currentVersion=${currentVersion}, targetVersion=${targetVersion}`,
  )

  try {
    if (!semver.valid(currentVersion) || !semver.valid(targetVersion)) {
      throw new Error(
        `Invalid versions provided: currentVersion=${currentVersion}, targetVersion=${targetVersion}`,
      )
    }

    const isScoped = packageName.startsWith('@')
    const [owner, repo] = isScoped
      ? packageName.slice(1).split('/')
      : [packageName, packageName]

    let repoDetails = { owner, repo }

    try {
      console.debug(`Validating repository: ${owner}/${repo}`)
      await octokit.rest.repos.get(repoDetails)
    } catch {
      console.warn(
        `Repository validation failed for ${packageName}, using package.json fallback`,
      )
      const metadata = getRepoFromPackageJson(packageName)
      if (metadata) {
        repoDetails = metadata
      } else {
        throw new Error(`Unable to resolve repository for ${packageName}`)
      }
    }

    console.debug(`Using repository: ${repoDetails.owner}/${repoDetails.repo}`)
    const releases = await octokit.paginate(octokit.rest.repos.listReleases, {
      owner: repoDetails.owner,
      repo: repoDetails.repo,
    })

    const filteredReleases = releases.filter((release) => {
      const version = semver.valid(release.tag_name.replace(/^v/, ''))
      if (!version) return false
      return (
        semver.gt(version, currentVersion) && semver.lte(version, targetVersion)
      )
    })

    console.debug(`Filtered releases: ${filteredReleases.length}`)
    if (filteredReleases.length === 0) {
      throw new Error(
        `No releases found between ${currentVersion} and ${targetVersion}`,
      )
    }

    const aggregatedNotes = filteredReleases
      .map((release) => release.body || '')
      .join('\n\n')

    return {
      body: aggregatedNotes,
      breakingChanges: extractNotesWithBreakingChanges(aggregatedNotes),
    }
  } catch (err) {
    console.error(
      `Error fetching release notes for ${packageName}: ${err.message}`,
    )

    const pkgPath = path.resolve('node_modules', packageName)

    console.debug(`Attempting local changelog parse for ${packageName}`)
    let fallbackNotes = parseLocalChangelog(pkgPath)

    if (fallbackNotes === 'No changelog found.') {
      console.debug(
        `Attempting conventional-changelog fallback for ${packageName}`,
      )
      fallbackNotes = await generateChangelogFallback(pkgPath)
    }

    return {
      body: fallbackNotes,
      breakingChanges: extractNotesWithBreakingChanges(fallbackNotes),
    }
  }
}

// // Import required libraries
// import { Octokit } from '@octokit/rest'
// import { parser } from 'keep-a-changelog'
// import fs from 'fs'
// import path from 'path'
// import { execSync } from 'child_process'
// import semver from 'semver' // Add semver for robust version handling

// // Initialize Octokit with authentication support
// const octokit = new Octokit({
//   auth: process.env.GITHUB_TOKEN, // Use GITHUB_TOKEN from environment variables
// })

// /**
//  * Extracts breaking changes from release notes.
//  * @param {string} releaseNotes - Raw release notes text.
//  * @returns {Array<string>} A list of breaking changes.
//  */
// export function extractNotesWithBreakingChanges(releaseNotes) {
//   if (typeof releaseNotes !== 'string') {
//     console.warn(
//       'Invalid release notes content provided to extractNotesWithBreakingChanges.',
//     )
//     return []
//   }

//   const breakingChanges = []
//   const lines = releaseNotes.split('\n')
//   lines.forEach((line) => {
//     if (line.toLowerCase().includes('breaking change')) {
//       breakingChanges.push(line.trim())
//     }
//   })
//   return breakingChanges.length > 0 ? breakingChanges : []
// }

// /**
//  * Parses a local CHANGELOG.md file for release notes.
//  * @param {string} pkgPath - Path to the package.
//  * @returns {string} Parsed changelog content.
//  */
// export function parseLocalChangelog(pkgPath) {
//   const changelogPath = path.join(pkgPath, 'CHANGELOG.md')
//   if (fs.existsSync(changelogPath)) {
//     try {
//       const changelog = parser(fs.readFileSync(changelogPath, 'utf-8'))
//       return (
//         changelog.getLatestRelease()?.description ||
//         'No release notes available.'
//       )
//     } catch (err) {
//       console.error(`Error parsing changelog: ${err.message}`)
//       return 'Failed to parse changelog.'
//     }
//   }
//   return 'No changelog found.'
// }

// /**
//  * Fetches repository metadata from the package.json file.
//  * @param {string} packageName - Package name (e.g., @scope/package or package).
//  * @returns {Object} Owner and repository extracted from the repository URL.
//  */
// function getRepoFromPackageJson(packageName) {
//   try {
//     const packageInfo = JSON.parse(
//       execSync(`npm view ${packageName} --json`).toString(),
//     )
//     const repoUrl = packageInfo.repository?.url || ''
//     const match = repoUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)/)
//     if (match) {
//       return { owner: match[1], repo: match[2] }
//     }
//   } catch (err) {
//     console.warn(
//       `Failed to fetch package.json metadata for ${packageName}: ${err.message}`,
//     )
//   }
//   return null
// }

// /**
//  * Fetches release notes from GitHub using Octokit.
//  * @param {string} packageName - Package name (e.g., @scope/package or package).
//  * @param {string} currentVersion - Current version.
//  * @param {string} targetVersion - Target version.
//  * @returns {Promise<Object>} Release notes and breaking changes.
//  */
// export async function fetchReleaseNotes(
//   packageName,
//   currentVersion,
//   targetVersion,
// ) {
//   console.debug(
//     `fetchReleaseNotes called with packageName=${packageName}, currentVersion=${currentVersion}, targetVersion=${targetVersion}`,
//   )

//   try {
//     if (!semver.valid(currentVersion) || !semver.valid(targetVersion)) {
//       throw new Error(
//         `Invalid versions provided: currentVersion=${currentVersion}, targetVersion=${targetVersion}`,
//       )
//     }

//     const isScoped = packageName.startsWith('@')
//     const [owner, repo] = isScoped
//       ? packageName.slice(1).split('/')
//       : [packageName, packageName]

//     let repoDetails = { owner, repo }

//     try {
//       console.debug(`Validating repository: ${owner}/${repo}`)
//       await octokit.rest.repos.get(repoDetails)
//     } catch {
//       console.warn(
//         `Repository validation failed for ${packageName}, using package.json fallback`,
//       )
//       const metadata = getRepoFromPackageJson(packageName)
//       if (metadata) {
//         repoDetails = metadata
//       } else {
//         throw new Error(`Unable to resolve repository for ${packageName}`)
//       }
//     }

//     console.debug(`Using repository: ${repoDetails.owner}/${repoDetails.repo}`)
//     const releases = await octokit.paginate(octokit.rest.repos.listReleases, {
//       owner: repoDetails.owner,
//       repo: repoDetails.repo,
//     })

//     const filteredReleases = releases.filter((release) => {
//       const version = semver.valid(release.tag_name.replace(/^v/, ''))
//       if (!version) return false
//       return (
//         semver.gt(version, currentVersion) && semver.lte(version, targetVersion)
//       )
//     })

//     console.debug(`Filtered releases: ${filteredReleases.length}`)
//     if (filteredReleases.length === 0) {
//       throw new Error(
//         `No releases found between ${currentVersion} and ${targetVersion}`,
//       )
//     }

//     const aggregatedNotes = filteredReleases
//       .map((release) => release.body || '')
//       .join('\n\n')

//     return {
//       body: aggregatedNotes,
//       breakingChanges: extractNotesWithBreakingChanges(aggregatedNotes),
//     }
//   } catch (err) {
//     console.error(
//       `Error fetching release notes for ${packageName}: ${err.message}`,
//     )
//     return { body: '', breakingChanges: [] }
//   }
// }

//  -----------------------------------------------------------------------------------

// import axios from 'axios'
// import { parser } from 'keep-a-changelog'
// import fs from 'fs'
// import path from 'path'

// /**
//  * Extracts breaking changes from release notes.
//  * @param {string} releaseNotes - Raw release notes text.
//  * @returns {Array<string>} A list of breaking changes.
//  */
// export function extractNotesWithBreakingChanges(releaseNotes) {
//   if (typeof releaseNotes !== 'string') {
//     console.warn(
//       'Invalid release notes content provided to extractNotesWithBreakingChanges.',
//     )
//     return []
//   }

//   const breakingChanges = []
//   const lines = releaseNotes.split('\n')
//   lines.forEach((line) => {
//     if (line.toLowerCase().includes('breaking change'))
//       breakingChanges.push(line.trim())
//   })
//   return breakingChanges.length > 0 ? breakingChanges : []
// }

// /**
//  * Parses a local CHANGELOG.md file for release notes.
//  * @param {string} pkgPath - Path to the package.
//  * @returns {string} Parsed changelog content.
//  */
// export function parseLocalChangelog(pkgPath) {
//   const changelogPath = path.join(pkgPath, 'CHANGELOG.md')
//   if (fs.existsSync(changelogPath)) {
//     try {
//       const changelog = parser(fs.readFileSync(changelogPath, 'utf-8'))
//       return (
//         changelog.getLatestRelease()?.description ||
//         'No release notes available.'
//       )
//     } catch (err) {
//       console.error(`Error parsing changelog: ${err.message}`)
//       return 'Failed to parse changelog.'
//     }
//   }
//   return 'No changelog found.'
// }

// /**
//  * Fetches release notes from NPM or GitHub.
//  * @param {string} pkg - Package name.
//  * @param {string} version - Target version.
//  * @returns {Promise<Object>} Release notes and breaking changes.
//  */
// export async function fetchReleaseNotes(pkg, version) {
//   try {
//     const npmResponse = await axios.get(`https://registry.npmjs.org/${pkg}`)
//     const repoUrl = npmResponse.data.repository?.url

//     if (!repoUrl || !repoUrl.includes('github.com')) {
//       console.warn(`Repository URL missing or not GitHub for package: ${pkg}`)
//       return { body: '', breakingChanges: [] }
//     }

//     const [, owner, repo] =
//       repoUrl.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git|$)/) || []
//     if (!owner || !repo)
//       throw new Error(`Failed to parse GitHub repo for package: ${pkg}`)

//     const releasesResponse = await axios.get(
//       `https://api.github.com/repos/${owner}/${repo}/releases`,
//     )
//     const latestRelease = releasesResponse.data.find((release) =>
//       release.tag_name.includes(version),
//     )

//     if (!latestRelease || !latestRelease.body)
//       throw new Error(`No release notes found for version ${version}`)

//     return {
//       body: latestRelease.body,
//       breakingChanges: extractNotesWithBreakingChanges(latestRelease.body),
//     }
//   } catch (err) {
//     console.error(`Error fetching release notes for ${pkg}: ${err.message}`)
//     return { body: '', breakingChanges: [] } // Return a safe fallback
//   }
// }
