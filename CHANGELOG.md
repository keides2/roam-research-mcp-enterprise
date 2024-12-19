# Changelog

All notable changes to the Roam Research MCP server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2024-03-14

### Changed

- Improved environment variable handling with better debug logging
- Added support for loading .env from both current directory and roam-research directory
- Added detailed error messages explaining configuration options
- Updated documentation with clearer setup instructions for both configuration methods

## [0.1.0] - 2024-12-19

### Added

- Initial release of the Roam Research MCP server
- Implemented ten core tools for Roam Research API interaction:
  - search_blocks: Search for blocks containing specific text
  - create_page: Create new pages with optional content
  - create_block: Create new blocks in existing pages
  - pull_data: Get data for specific blocks/pages
  - pull_many_data: Get data for multiple blocks/pages
  - move_block: Move blocks to new locations
  - update_block: Update block content and properties
  - delete_block: Delete blocks
  - delete_page: Delete pages
  - batch_actions: Perform multiple operations at once
- Full TypeScript support with comprehensive type definitions
- Proper error handling for all API responses
- Support for finding existing pages before creation
- Support for batch operations
- Detailed input schemas for all tools
- Comprehensive documentation in README.md
