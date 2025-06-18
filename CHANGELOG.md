# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-06-17

### Added
- **Initial Release** - First stable version of Patchworks CLI
- **Core CLI Interface** - Complete command-line interface with three main commands:
  - `patchworks menu` - Interactive main menu
  - `patchworks update` - Run dependency updates with options
  - `patchworks reports` - Generate reports without making changes
- **Semantic Versioning Support** - Handle patch, minor, and major version updates
- **Breaking Change Detection** - Automatically detect and categorize breaking changes
- **Release Notes Analysis** - Fetch and analyze release notes from GitHub
- **TF-IDF Ranking** - Compute importance rankings for terms in release notes
- **Interactive Menu System** - User-friendly navigation and configuration
- **Configuration Management** - Support for `patchworks-config.json` configuration files
- **Comprehensive Options**:
  - `--limit` - Limit number of packages processed
  - `--level-scope` - Control semantic version filtering (strict/cascade)
  - `--summary` - Generate summary reports
  - `--skipped` - Show skipped packages
  - `--install` - Install dependencies after processing
  - `--exclude-repoless` - Exclude packages without repositories
  - `--show-excluded` - Show excluded packages in output
  - `--debug` - Verbose debug output
- **Multi-format Reports** - Console and Markdown report generation
- **GitHub Integration** - Fetch release notes, changelogs, and commit information
- **Dependency Analysis** - Analyze npm package dependencies and metadata
- **Version Processing** - Advanced version comparison and filtering
- **Error Handling** - Comprehensive error handling and user feedback
- **Test Suite** - 38 comprehensive tests covering CLI, validation, and imports
- **Documentation** - Complete README with CLI reference and API documentation

### Technical Features
- **ES Modules** - Full ES module support with proper configuration
- **Node.js 14+ Support** - Compatible with Node.js 14.0.0 and higher
- **Cross-platform** - Works on Windows, macOS, and Linux
- **NPM Package** - Properly configured for npm publication
- **Binary Permissions** - Executable permissions properly set
- **Dependency Management** - Clean dependency tree with no vulnerabilities

### Dependencies
- **CLI Framework** - Commander.js for command-line interface
- **Interactive Prompts** - Inquirer.js for user interaction
- **HTTP Requests** - Axios for API communication
- **Markdown Processing** - Marked and markdown-it for content parsing
- **Text Analysis** - Natural language processing for release notes
- **Styling** - Chalk and Boxen for beautiful console output
- **GitHub API** - Octokit for GitHub integration
- **Semantic Versioning** - Semver for version comparison
- **Testing** - Jest and Babel for comprehensive testing

## [Unreleased]

### Planned Features
- Enhanced breaking change detection algorithms
- Support for additional package registries beyond npm
- Integration with popular CI/CD platforms
- Advanced filtering and search capabilities
- Performance optimizations for large dependency trees
- Plugin system for extensibility
- Web dashboard for project overview
- Automated dependency update scheduling

---

## Version History

- **0.1.0** - Initial stable release with core functionality
- **Pre-release** - Development versions and alpha testing

## Breaking Changes

### 0.1.0
- This is the initial release, so no breaking changes from previous versions

## Migration Guide

### Upgrading to 0.1.0
This is the initial release. To start using Patchworks:

1. Install globally: `npm install -g patchworks`
2. Verify installation: `patchworks --version`
3. Get started: `patchworks menu`

For more information, see the [README.md](README.md) file. 