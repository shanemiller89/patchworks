# Patchworks (0.1.0)

![Patchworks Logo](https://github.com/shanemiller89/patchworks/blob/main/assets/patchworks_title.png)

## Overview
Patchworks is a CLI tool designed to streamline version management and change tracking in software projects. This alpha version demonstrates its core functionalities.

# Major work in progress! Useable, but buggy and unstable.

## Features

- Detects and processes breaking changes in dependencies.
- Generates update reports in Markdown and console formats.
- Fetches release notes and changelogs automatically from GitHub or fallback URLs.
- Validates package metadata to ensure required fields are present.
- Categorizes release notes into various types such as features, fixes, and breaking changes.
- Computes TF-IDF rankings for important terms in release notes.
- Provides a user-friendly command-line interface for managing updates.

![Patchworks Menu](https://github.com/shanemiller89/patchworks/blob/main/assets/patchworks_menu.png)

## Installation

### Global Installation (Recommended)
Install Patchworks globally to use it from any directory:
```bash
npm install -g patchworks
```

### Local Installation
Install Patchworks in your project:
```bash
npm install patchworks
```

### Development Installation
For development or testing:
```bash
git clone https://github.com/shanemiller89/patchworks.git
cd patchworks
npm install
npm link  # Creates a global symlink for development
```

### Requirements
- Node.js 14 or higher
- npm 6 or higher

### Troubleshooting

#### Node.js Version Managers
If you're using a Node.js version manager (like nvm, asdf, or n), you might need additional steps:

- **asdf**: After installation, run `asdf reshim nodejs`
- **nvm**: No additional steps needed
- **n**: No additional steps needed

If the `patchworks` command is not found after installation:
1. Verify the installation: `npm list -g patchworks`
2. Check your PATH: `echo $PATH`
3. Try reinstalling: `npm uninstall -g patchworks && npm install -g patchworks`

## Usage

### Global Installation
If installed globally, use the command directly:
```bash
patchworks --help
```

### Local Installation
If installed locally, use npx:
```bash
npx patchworks --help
```

### Available Commands
Get help on any command:
```bash
patchworks help [command]
```

## Example Commands

- To update with a specific level:
  ```bash
  npx patchworks update minor --limit 10
  ```

- To generate a report:
  ```bash
  npx patchworks reports minor
  ```

- To display the main menu:
  ```bash
  npx patchworks menu
  ```
- To generate a default configuration file:
  1. Run the main menu command:
     ```bash
     npx patchworks menu
     ```
  2. Choose **Generate Config** to create `patchworks-config.json` in your project.

## Commands

- **update**: Run the main update program with options.
  - Required Argument: `<level> <patch, minor, major>` (Specify the update level: patch, minor, major).
  - Optional Options: `--limit <number>`, `--level-scope <scope>`, `--summary`, `--skipped`, `--install`, `--exclude-repoless`, `--show-excluded`.

- **reports**: Generate reports based on the current state of dependencies.
  - Required Argument: `<level> <patch, minor, major>` (Specify the update level: patch, minor, major).
  - Optional Options: `--limit <number>`, `--level-scope <scope>`, `--summary`, `--skipped`, `--exclude-repoless`, `--show-excluded`.

- **menu**: Display the main menu for navigating the tool.
  - Optional Argument: `[level] <patch, minor, major>` (Specify the update level: patch, minor, major).
  - Optional Options: `--limit <number>`, `--level-scope <scope>`, `--summary`, `--skipped`, `--install`, `--exclude-repoless`, `--show-excluded`.

## Notes
- This is an alpha release intended for internal testing and development.
- Feedback and bug reports are welcome via GitHub issues
- For installation issues, please check the troubleshooting section above

## License
MIT License

