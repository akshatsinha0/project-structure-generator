# Change Log

All notable changes to the "project-structure-generator" extension will be documented in this file.

## [0.0.5] - 2025-01-08

### Added
- **Interactive Folder Exclusion Dialog**: When running "Generate Project Structure", users now see a popup window with a list of all folders in the project
- **Multi-select Interface**: Users can select/deselect which folders to exclude from the generated structure
- **Smart Pre-selection**: Common build and cache folders (node_modules, .git, .vscode, dist, build, out, .nyc_output, coverage) are automatically pre-selected for exclusion
- **Enhanced Output**: Generated structure now includes information about which folders were excluded

### Changed
- Improved folder filtering logic to respect user selections
- Enhanced project structure generation to be more flexible and user-controlled

## [0.0.4] - Previous Release

- Initial release with basic project structure generation