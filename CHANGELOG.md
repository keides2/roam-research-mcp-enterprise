# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2025-01-03

### Added

- Two new search tools:
  - `roam_search_block_refs`: Search for block references
    - Find references to specific blocks
    - Search within specific pages or across entire graph
    - Supports both direct and indirect references
  - `roam_search_hierarchy`: Navigate block relationships
    - Search up/down block hierarchies
    - Configurable search depth
    - Parent/child relationship traversal
    - Optional page scope filtering

## [0.3.0] - 2025-01-03

### Added

- New negative tag filtering in tag search
  - Added `exclude_tag` parameter to TagSearchParams
  - Supports excluding blocks containing specific tags
  - Works with both #tag and [[page]] reference formats
  - Can be combined with existing near_tag parameter
  - Clear search description showing excluded tags

### Enhanced

- Improved tag search error handling
- Better handling of no-results scenarios
- Updated documentation with tag exclusion examples

## [0.2.0] - 2024-01-01

### Added

- Revamped the entire structure of the app
- New `roam_create_outline` tool for creating hierarchical outlines
  - Support for up to 10 levels of nesting
  - Validation of outline structure and content
  - Optional header block
  - Efficient batch operations
  - Proper parent-child relationship handling

### Enhanced

- Improved error handling with more descriptive messages
- Better validation for nested content structures
- Updated documentation with new outline tool examples

## [0.12.3] - Previous version

[Previous changelog entries would go here]
