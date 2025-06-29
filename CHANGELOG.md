v.0.29.0

- ADDED: **Batch Processing Tool**: Introduced `roam_process_batch_actions`, a powerful new tool for executing a sequence of low-level block actions (create, update, move, delete) in a single API call. This enables complex, multi-step workflows, programmatic content reorganization, and high-performance data imports.
- ENHANCED: **Schema Clarity**: Updated the descriptions for multiple tool parameters in `src/tools/schemas.ts` to explicitly state that using a block or page UID is preferred over text-based identifiers for improved accuracy and reliability.
- NOTE: **Heading Removal Limitation**: Discovered that directly removing heading formatting (e.g., setting `heading` to `0` or `null`) via `update-block` action in `roam_process_batch_actions` is not supported by the Roam API. The `heading` attribute persists its value.

v.0.28.0

- ADDED: **Configurable HTTP and SSE Ports**: The HTTP and SSE server ports can now be configured via environment variables (`HTTP_STREAM_PORT` and `SSE_PORT`).
- ADDED: **Automatic Port Conflict Resolution**: The server now automatically checks if the desired ports are in use and finds the next available ports, preventing startup errors due to port conflicts.

v.0.27.0

- ADDED: SSE (Server-Sent Events) transport support for legacy clients.
- REFACTORED: `src/server/roam-server.ts` to use separate MCP `Server` instances for each transport (Stdio, HTTP Stream, and SSE) to ensure they can run concurrently without conflicts.
- ENHANCED: Each transport now runs on its own isolated `Server` instance, improving stability and preventing cross-transport interference.
- UPDATED: `src/config/environment.ts` to include `SSE_PORT` for configurable SSE endpoint (defaults to `8087`).

v.0.26.0

- ENHANCED: Added HTTP Stream Transport support
- Implemented dual transport support for Stdio and HTTP Stream, allowing communication via both local processes and network connections.
- Updated `src/config/environment.ts` to include `HTTP_STREAM_PORT` for configurable HTTP Stream endpoint.
- Modified `src/server/roam-server.ts` to initialize and connect `StreamableHTTPServerTransport` alongside `StdioServerTransport`.
- Configured HTTP server to listen on `HTTP_STREAM_PORT` and handle requests via `StreamableHTTPServerTransport`.

v.0.25.7

- FIXED: `roam_fetch_page_by_title` schema definition
- Corrected missing `name` property and proper nesting of `inputSchema` in `src/tools/schemas.ts`.
- ENHANCED: Dynamic tool loading and error reporting
- Implemented dynamic loading of tool capabilities from `toolSchemas` in `src/server/roam-server.ts` to ensure consistency.
- Added robust error handling during server initialization (graph, tool handlers) and connection attempts in `src/server/roam-server.ts` to provide more specific feedback on startup issues.
- CENTRALIZED: Versioning in `src/server/roam-server.ts`
- Modified `src/server/roam-server.ts` to dynamically read the version from `package.json`, ensuring a single source of truth for the project version.

v.0.25.6

- ADDED: Docker support
- Created a `Dockerfile` for containerization.
- Added an `npm start` script to `package.json` for running the application within the Docker container.

v.0.25.5

- ENHANCED: `roam_create_outline` tool for better heading and nesting support
- Reverted previous change in `src/tools/operations/outline.ts` to preserve original indentation for outline items.
- Refined `parseMarkdown` in `src/markdown-utils.ts` to correctly parse markdown heading syntax (`#`, `##`, `###`) while maintaining the block's hierarchical level based on indentation.
- Updated `block_text_uid` description in `roam_create_outline` schema (`src/tools/schemas.ts`) to clarify its use for specifying a parent block by text or UID.
- Clarified that `roam_create_block` creates blocks directly on a page and does not support nesting under existing blocks. `roam_create_outline` should be used for this purpose.

v.0.25.4

- ADDED: `format` parameter to `roam_fetch_page_by_title` tool
- Allows fetching page content as raw JSON data (blocks with UIDs) or markdown.
- Updated `fetchPageByTitle` in `src/tools/operations/pages.ts` to return stringified JSON for raw format.
- Updated `roam_fetch_page_by_title` schema in `src/tools/schemas.ts` to include `format` parameter with 'raw' as default.
- Updated `fetchPageByTitle` handler in `src/tools/tool-handlers.ts` to pass `format` parameter.
- Updated `roam_fetch_page_by_title` case in `src/server/roam-server.ts` to extract and pass `format` parameter.

v.0.25.3

- FIXED: roam_create_block multiline content ordering issue
- Root cause: Simple newline-separated content was being created in reverse order
- Solution: Added logic to detect simple newline-separated content and reverse the nodes array to maintain original order
- Fix is specific to simple multiline content without markdown formatting, preserving existing behavior for complex markdown

v.0.25.2

- FIXED: roam_create_block heading formatting issue
- Root cause: Missing heading parameter extraction in server request handler
- Solution: Added heading parameter to roam_create_block handler in roam-server.ts
- Also removed problematic default: 0 from heading schema definition
- Heading formatting now works correctly for both single and multi-line blocks
- roam_create_block now properly applies H1, H2, and H3 formatting when heading parameter is provided

v.0.25.1

- Investigated heading formatting issue in roam_create_block tool
- Attempted multiple fixes: direct createBlock API → batchActions → convertToRoamActions → direct batch action creation
- Confirmed roam_create_page works correctly for heading formatting
- Identified that heading formatting fails specifically for single block creation via roam_create_block
- Issue remains unresolved despite extensive troubleshooting and multiple implementation approaches
- Current status: roam_create_block does not apply heading formatting, investigation ongoing

v.0.25.0

- Updated roam_create_page to use batchActions

v.0.24.6

- Updated roam_create_page to use explicit levels

v.0.24.5

- Enhanced createOutline to properly handle block_text_uid as either a 9-character UID or string title
- Added proper detection and use of existing blocks when given a valid block UID
- Improved error messages to be more specific about block operations

v.0.24.4

- Clarified roam_search_by_date and roam_fetch_page_by_title when it comes to searching for daily pages vs. blocks by date

v.0.24.3

- Clarified roam_update_multiple_blocks
- Added a variable to roam_find_pages_modified_today

v.0.24.2

- Added sort_by and filter_tag to roam_recall

v.0.24.1

- Fixed searchByStatus for TODO checks
- Added resolution of references to various tools

v.0.23.2

- Fixed create_page tool as first-level blocks were created in reversed order

v.0.23.1

- Fixed roam_outline tool not writing properly

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

- Added roam_find_pages_modified_today tool to search for pages modified since midnight today

v0.14
