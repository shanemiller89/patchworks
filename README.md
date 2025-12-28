# Patchworks

[![npm version](https://badge.fury.io/js/patchworks-cli.svg)](https://badge.fury.io/js/patchworks-cli)
[![Downloads](https://img.shields.io/npm/dm/patchworks-cli.svg)](https://www.npmjs.com/package/patchworks-cli)
[![CI](https://github.com/shanemiller89/patchworks/workflows/CI/badge.svg)](https://github.com/shanemiller89/patchworks/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/patchworks-cli.svg)](https://nodejs.org/)

![Patchworks Logo](https://github.com/shanemiller89/patchworks/blob/main/assets/patchworks_title.png)

## Overview
Patchworks is a powerful CLI tool designed to streamline version management and change tracking in software projects. It helps developers efficiently manage dependency updates by providing semantic versioning analysis, breaking change detection, and batch selection capabilities with AI-powered analysis for intelligent prioritization.



## Features

- Detects and processes breaking changes in dependencies.
- Generates update reports in Markdown and console formats.
- Fetches release notes and changelogs automatically from GitHub or fallback URLs.
- Validates package metadata to ensure required fields are present.
- Categorizes release notes into various types such as features, fixes, and breaking changes.
- Computes TF-IDF rankings for important terms in release notes.
- AI-powered analysis for intelligent prioritization (optional).
- Provides a user-friendly command-line interface for managing updates.

![Patchworks Menu](https://github.com/shanemiller89/patchworks/blob/main/assets/patchworks_menu.png)

## Installation

### Global Installation (Recommended)
Install Patchworks globally to use it from any directory:
```bash
npm install -g patchworks-cli
```

### Local Installation
Install Patchworks in your project:
```bash
npm install patchworks-cli
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

### Verify Installation
After installation, verify that Patchworks is working correctly:

```bash
# Check version
patchworks --version

# View available commands
patchworks --help

# Test a command (shows help for reports)
patchworks reports --help
```

If you encounter any issues, see the Troubleshooting section below.

### Troubleshooting

#### Node.js Version Managers
If you're using a Node.js version manager (like nvm, asdf, or n), you might need additional steps:

- **asdf**: After installation, run `asdf reshim nodejs`
- **nvm**: No additional steps needed
- **n**: No additional steps needed

If the `patchworks` command is not found after installation:
1. Verify the installation: `npm list -g patchworks-cli`
2. Check your PATH: `echo $PATH`
3. Try reinstalling: `npm uninstall -g patchworks-cli && npm install -g patchworks-cli`

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

## CLI Commands Reference

### `patchworks menu`
Display the interactive main menu for navigating the tool.

```bash
# Basic usage
patchworks menu

# With specific level and options
patchworks menu minor --limit 5 --summary
```

**Options:**
- `[level]` - Optional update level (patch, minor, major)
- `--limit <number>` - Limit the number of updates processed
- `--level-scope <scope>` - Control semantic version filtering (strict or cascade)
- `--summary` - Generate a summary report
- `--skipped` - Show skipped packages in the output
- `--install` - Install dependencies after processing

### `patchworks update`
Run the main update program with specified options.

```bash
# Update minor versions with limit
patchworks update minor --limit 10

# Update patch versions with installation
patchworks update patch --limit 5 --install

# Update with summary and show excluded packages
patchworks update major --summary --show-excluded
```

**Arguments:**
- `<level>` - Required update level (patch, minor, major)

**Options:**
- `--limit <number>` - Limit the number of updates processed
- `--level-scope <scope>` - Control semantic version filtering (strict or cascade)
- `--summary` - Generate a summary report
- `--skipped` - Show skipped packages in the output
- `--install` - Install dependencies after processing
- `--exclude-repoless` - Exclude packages without repositories
- `--show-excluded` - Show excluded packages in the console output

### `patchworks reports`
Generate reports based on the current state of dependencies (read-only mode).

```bash
# Generate a minor version report
patchworks reports minor

# Generate patch report with summary
patchworks reports patch --summary --limit 20

# Generate comprehensive report showing all details
patchworks reports major --skipped --show-excluded
```

**Arguments:**
- `<level>` - Required update level (patch, minor, major)

**Options:**
- `--limit <number>` - Limit the number of updates processed
- `--level-scope <scope>` - Control semantic version filtering (strict or cascade)
- `--summary` - Generate a summary report
- `--skipped` - Show skipped packages in the output
- `--exclude-repoless` - Exclude packages without repositories
- `--show-excluded` - Show excluded packages in the console output

## Example Workflows

### Basic Update Workflow
```bash
# 1. First, generate a report to see what's available
patchworks reports minor --summary

# 2. Run the update process with a reasonable limit
patchworks update minor --limit 10 --summary

# 3. Use the interactive menu for more control
patchworks menu minor
```

### Configuration Setup
Generate a default configuration file:
1. Run the main menu command:
   ```bash
   patchworks menu
   ```
2. Choose **Generate Config** to create `patchworks-config.json` in your project.

### Advanced Usage
```bash
# Update only packages with repositories, excluding those without
patchworks update patch --exclude-repoless --limit 15

# Generate detailed report showing skipped packages
patchworks reports minor --skipped --show-excluded --summary

# Debug mode for troubleshooting
patchworks update minor --debug --limit 5
```

## API Documentation

Patchworks can also be used as a module in your Node.js applications.

### Basic Usage

```javascript
import { main } from 'patchworks-cli';
import { readConfig } from 'patchworks-cli/config/configUtil.js';

// Run patchworks programmatically
const options = {
  level: 'minor',
  limit: 10,
  summary: true,
  reportsOnly: true // Generate reports without making changes
};

await main(options);
```

### Core Functions

#### `main(options)`
Main entry point for running patchworks programmatically.

**Parameters:**
- `options` (Object) - Configuration options
  - `level` (String) - Update level: 'patch', 'minor', or 'major'
  - `limit` (Number) - Maximum number of packages to process
  - `summary` (Boolean) - Generate summary report
  - `reportsOnly` (Boolean) - Only generate reports, don't make changes
  - `install` (Boolean) - Install dependencies after processing
  - `excludeRepoless` (Boolean) - Exclude packages without repositories

#### `readConfig()`
Read configuration from `patchworks-config.json`.

```javascript
import { readConfig } from 'patchworks-cli/config/configUtil.js';

const config = await readConfig();
console.log(config); // { level: 'minor', limit: 10, ... }
```

#### Configuration Utilities

```javascript
import { generateConfig } from 'patchworks-cli/config/configUtil.js';

// Generate a default configuration file
await generateConfig();
```

### Analysis Functions

#### TF-IDF Analysis
```javascript
import { computeTFIDFRanking } from 'patchworks-cli/analysis/computeTFIDFRanking.js';

const rankings = computeTFIDFRanking(releaseNotes);
```

#### Log Categorization
```javascript
import { categorizeLogs } from 'patchworks-cli/analysis/categorizeLogs.js';

const categories = categorizeLogs(logData);
```

### Version Processing

```javascript
import { processVersions } from 'patchworks-cli/tasks/versionProcessor/versionProcessor.js';

const results = await processVersions(packages, options);
```

## Development

### Setting Up Development Environment

1. **Clone the repository**
   ```bash
   git clone https://github.com/shanemiller89/patchworks.git
   cd patchworks
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

4. **Run tests**
   ```bash
   npm test
   ```

5. **Run linter**
   ```bash
   npm run lint
   ```

### Available Scripts

- `npm run dev` - Run the CLI in development mode with tsx
- `npm run build` - Build the TypeScript project
- `npm test` - Run tests with coverage
- `npm run test:watch` - Run tests in watch mode
- `npm run test:ui` - Run tests with UI
- `npm run lint` - Run ESLint on the codebase
- `npm run lint:fix` - Run ESLint and auto-fix issues
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking
- `npm run local:install` - Create a global symlink for local development
- `npm run local:uninstall` - Remove the global symlink

### CI/CD Pipeline

The project uses GitHub Actions for continuous integration and deployment:

1. **CI Workflow** (`.github/workflows/ci.yml`)
   - Runs on every push to `main` and `develop` branches
   - Runs on all pull requests to `main`
   - Tests on Node.js versions: 14, 16, 18, 20
   - Steps: Lint → Build → Test → Package installation test
   - Includes security audit and package validation

2. **CodeQL Workflow** (`.github/workflows/codeql.yml`)
   - Security scanning for JavaScript/TypeScript
   - Runs weekly on Mondays
   - Runs on pushes and PRs to `main`

3. **Publish Workflow** (`.github/workflows/publish.yml`)
   - Automatically publishes to NPM on release
   - Runs full test suite before publishing
   - Verifies publication after deployment

### Contributing

Before submitting a pull request:

1. Ensure all tests pass: `npm test`
2. Run the linter: `npm run lint`
3. Build the project: `npm run build`
4. Test the package installation: `./scripts/pre-publish.sh`

All CI checks must pass before merging.

## Notes
- This is the stable release of Patchworks with AI-powered analysis capabilities
- Feedback and bug reports are welcome via GitHub issues
- For installation issues, please check the troubleshooting section above
- See [CHANGELOG.md](CHANGELOG.md) for version history and breaking changes

## License
MIT License

