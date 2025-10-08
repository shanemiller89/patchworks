# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2025-10-08

### Added
- **🤖 AI-Powered Critical Findings Analysis**
  - Integrated AI analysis for dependency updates using Anthropic Claude, OpenAI GPT-4, and Google Gemini
  - Automatic detection of breaking changes, security issues, and migration requirements
  - Intelligent recommendations for update order based on dependencies and risk
  - Configurable focus areas (breaking changes, security, deprecation, performance, migration)
  - Multi-provider support with automatic fallback (Anthropic → OpenAI → Gemini)
  - Provider-specific model selection (Claude 3.5 Sonnet, GPT-4o, Gemini 2.0 Flash)
- **📄 Rich Markdown Reports with Code Examples**
  - AI generates comprehensive markdown reports with syntax-highlighted code blocks
  - Before/after code examples for breaking changes
  - Mermaid diagrams showing dependency flow and update sequence
  - Detailed migration steps with bash commands and configuration changes
  - Color-coded risk assessment (safe, caution, breaking)
- **🎨 CLI Markdown Preview**
  - Beautiful terminal markdown renderer with syntax highlighting
  - Displays first 40 lines of AI analysis directly in CLI
  - Supports JavaScript, TypeScript, Bash, JSON, and Diff highlighting
  - Formatted headers, lists, blockquotes, and inline code
  - Mermaid diagram placeholders with instructions to view full report
- **⚙️ Interactive AI Setup Wizard**
  - Guided setup process for AI configuration via "Generate Config" menu option
  - Support for all three providers (Anthropic, OpenAI, Gemini)
  - Secure API key handling with skip option for manual configuration later
  - Focus area selection (breaking changes, security, deprecation, etc.)
  - Provider selection (auto with fallback or specific provider)
- **🔑 Enhanced Configuration Management**
  - AI configuration section in `patchworks-config.json`
  - Toggle AI analysis on/off from main menu (keyboard shortcut: 'a')
  - Separate model configuration per provider (anthropicModel, openaiModel, geminiModel)
  - Security comments about API key storage in generated config
  - Provider-specific defaults (Claude 3.5 Sonnet, GPT-4o, Gemini 2.0 Flash)
- **🐛 Debug Logging for AI Requests**
  - Detailed logging of AI API requests (prompts sent)
  - Response logging with content preview and usage metadata
  - Masked API key display for security verification
  - Package data structure logging (releaseNotes type, source, etc.)
  - HTTP status codes and error details for troubleshooting
- **📝 Comprehensive Release Notes Handling**
  - Support for string, array, and object release note formats
  - Automatic extraction from multiple data structures
  - Changelog fallback when release notes unavailable
  - Explicit warnings when no release data found
  - Up to 5000 characters of raw release notes sent to AI

### Changed
- **Updated CLI Options**
  - Added `--ai-summary` flag to trigger AI-powered analysis
  - AI analysis respects debug mode for verbose output
- **Enhanced Error Handling**
  - Graceful workflow degradation when AI analysis fails
  - Detailed error messages for API quota issues
  - Fallback to other providers when primary fails
  - Clear user communication about AI-related issues
- **Improved Console Output**
  - Enhanced AI findings display with quick status indicators
  - Better visual hierarchy with colored sections
  - File location prominently displayed for full reports
- **Dependencies**
  - Added `@anthropic-ai/sdk` for Claude integration
  - Added `openai` for GPT-4 integration
  - Added `@google/genai` for Gemini 2.0 integration

### Fixed
- Release notes format handling now supports all data structures (string, array, object)
- Null reference error in `categorizeLogs.ts` when processing release notes
- AI workflow failures no longer block main dependency update process
- Proper error messages when API keys are missing

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