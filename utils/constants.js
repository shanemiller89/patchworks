export const MAIN_TITLE = `
██████╗  █████╗ ████████╗ ██████╗██╗  ██╗██╗    ██╗ ██████╗ ██████╗ ██╗  ██╗███████╗
██╔══██╗██╔══██╗╚══██╔══╝██╔════╝██║  ██║██║    ██║██╔═══██╗██╔══██╗██║ ██╔╝██╔════╝
██████╔╝███████║   ██║   ██║     ███████║██║ █╗ ██║██║   ██║██████╔╝█████╔╝ ███████╗
██╔═══╝ ██╔══██║   ██║   ██║     ██╔══██║██║███╗██║██║   ██║██╔══██╗██╔═██╗ ╚════██║
██║     ██║  ██║   ██║   ╚██████╗██║  ██║╚███╔███╔╝╚██████╔╝██║  ██║██║  ██╗███████║
╚═╝     ╚═╝  ╚═╝   ╚═╝    ╚═════╝╚═╝  ╚═╝ ╚══╝╚══╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝
`

export const HELP_MENU = `
      A utility for managing dependency updates efficiently.

      Example Usage:
        $ patchworks menu
        $ patchworks reports
        $ patchworks update --level=minor --limit=5

      Commands:
        menu                  Display the main menu.
        reports               Run a report-only workflow.
        update                Run the main update program with options.

      Required for 'update' command:
        --level <level>       Specify the update level (patch, minor, major).

      Optional for 'update' command:
        --limit <number>      Limit the number of updates processed (default: no limit).
        --level-scope <scope> Control semantic version filtering (strict or cascade).
        --summary             Generate a summary report.
        --skipped             Show skipped packages in the output.
        --write               Persist changes to package.json.
        --install             Install updated dependencies.
        --exclude-repoless    Skip packages without repository links.
        --show-excluded       Show excluded packages in the console output.

      ==============================================
      For more information, visit:
      https://github.com/shanemiller89/patchworks
      ==============================================
      `

export const UNKNOWN = 'UNKOWN'

export const SKIPPED = 'SKIPPED'

export const ALL = 'ALL'

export const CHANGELOG = 'CHANGELOG'

export const RELEASE_NOTES = 'RELEASE_NOTES'
