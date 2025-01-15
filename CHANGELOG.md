v.0.23.0

- Added advanced, more flexible datomic query

v.0.22.1

- Important description change in roam_remember

v0.22.0

- Restructured search functionality into dedicated directory with proper TypeScript support
- Fixed TypeScript errors and import paths throughout the codebase
- Improved outline creation to maintain exact input array order
- Enhanced recall() method to fetch memories from both tag searches and dedicated memories page
- Maintained backward compatibility while improving code organization

v0.21.0

- Added roam_recall tool to recall memories from all tags and the page itself.

v0.20.0

- Added roam_remember tool to remember specific memories as created on the daily page. Can be used throughout the graph. Tag set in environmental vars in config.

v0.19.0

- Changed default case-sensitivity behavior in search tools to match Roam's native behavior (now defaults to true)
- Updated case-sensitivity handling in findBlockWithRetry, searchByStatus, searchForTag, and searchByDate tools

v0.18.0

- Added roam_search_by_date tool to search for blocks and pages based on creation or modification dates
- Added support for date range filtering and content inclusion options

v0.17.0

- Enhanced roam_update_block tool with transform pattern support, allowing regex-based content transformations
- Added ability to update blocks with either direct content or pattern-based transformations

v0.16.0

- Added roam_search_by_text tool to search for blocks containing specific text, with optional page scope and case sensitivity
- Fixed roam_search_by_tag

v0.15.0

- Added find_pages_modified_today tool to search for pages modified since midnight today

v0.14
