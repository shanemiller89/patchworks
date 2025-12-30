export const MAIN_TITLE = `
██████╗  █████╗ ████████╗ ██████╗██╗  ██╗██╗    ██╗ ██████╗ ██████╗ ██╗  ██╗███████╗
██╔══██╗██╔══██╗╚══██╔══╝██╔════╝██║  ██║██║    ██║██╔═══██╗██╔══██╗██║ ██╔╝██╔════╝
██████╔╝███████║   ██║   ██║     ███████║██║ █╗ ██║██║   ██║██████╔╝█████╔╝ ███████╗
██╔═══╝ ██╔══██║   ██║   ██║     ██╔══██║██║███╗██║██║   ██║██╔══██╗██╔═██╗ ╚════██║
██║     ██║  ██║   ██║   ╚██████╗██║  ██║╚███╔███╔╝╚██████╔╝██║  ██║██║  ██╗███████║
╚═╝     ╚═╝  ╚═╝   ╚═╝    ╚═════╝╚═╝  ╚═╝ ╚══╝╚══╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝
`

export const UNKNOWN = 'UNKNOWN'

export const SKIPPED = 'SKIPPED'

export const ALL = 'ALL'

export const CHANGELOG = 'CHANGELOG'

export const RELEASE_NOTES = 'RELEASE_NOTES'

/**
 * Common file paths where changelog/release notes might be located
 * Used for fetching from unpkg and extracting from tarballs
 */
export const CHANGELOG_FILE_PATHS = [
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
