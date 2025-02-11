# Patchworks (Alpha)

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

## Installation

1. Clone this repository.
2. Install dependencies:
   ```bash
   npm install
   ```

## Usage
Run the CLI tool using:

```bash
npx patchworks --help
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
  npx patchworks menu patch
  ```

## Commands

- **update**: Run the main update program with options.
  - Required: `--level <level>` (Specify the update level: patch, minor, major).
  - Optional: `--limit <number>`, `--level-scope <scope>`, `--summary`, `--skipped`, `--write`, `--install`, `--exclude-repoless`, `--show-excluded`.

- **reports**: Generate reports based on the current state of dependencies.

- **menu**: Display the main menu for navigating the tool.

## Notes
- This is an alpha release intended for internal testing and development.
- Feedback and bug reports welcome

## License
MIT License

