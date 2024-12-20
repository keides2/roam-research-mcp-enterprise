# Changelog

All notable changes to the Roam Research MCP server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2024-03-14

### Changed

- Replaced `read_page` with `read_page_by_title` tool:
  - Finds pages by title first to get UID
  - Maintains all previous functionality including:
    - Retrieves all blocks with hierarchical structure
    - Recursively resolves block references up to 4 levels deep
    - Converts content to markdown format preserving nesting
  - Improves usability by allowing page lookup by title instead of requiring UID

## [0.4.0] - 2024-12-19

### Added

- New `read_page` tool for reading and resolving page content:
  - Retrieves all blocks from a page with their hierarchical structure
  - Recursively resolves block references (((uid))) up to 4 levels deep
  - Converts the content to markdown format preserving nesting
  - Uses indentation to represent block hierarchy
  - Returns a single markdown document with all references resolved

## [0.3.0] - 2024-03-14

### Added

- New `import_nested_markdown` tool for importing nested markdown content:
  - Supports headings (# to ######)
  - Supports bullet points (\* + -)
  - Supports numbered lists
  - Supports arbitrary nesting via indentation
  - Uses batch actions for efficient creation
  - Preserves hierarchical structure in Roam
  - Implements pre-generated UIDs for immediate block access:
    - Uses 9-character format matching Roam's convention
    - Generates using alphanumeric plus special chars (-, \_)
    - Enables direct block referencing during creation
    - Allows efficient parent-child relationship management

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
