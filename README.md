# Roam Research MCP Server

[![npm version](https://badge.fury.io/js/roam-research-mcp.svg)](https://badge.fury.io/js/roam-research-mcp)
[![Project Status: WIP – Initial development is in progress, but there has not yet been a stable, usable release suitable for the public.](https://www.repostatus.org/badges/latest/wip.svg)](https://www.repostatus.org/#wip)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub](https://img.shields.io/github/license/2b3pro/roam-research-mcp)](https://github.com/2b3pro/roam-research-mcp/blob/main/LICENSE)

A Model Context Protocol (MCP) server that provides comprehensive access to Roam Research's API functionality. This server enables AI assistants like Claude to interact with your Roam Research graph through a standardized interface. It supports both standard input/output (stdio) and HTTP Stream communication. (A WORK-IN-PROGRESS, personal project not officially endorsed by Roam Research)

<a href="https://glama.ai/mcp/servers/fzfznyaflu"><img width="380" height="200" src="https://glama.ai/mcp/servers/fzfznyaflu/badge" alt="Roam Research MCP server" /></a>

## Installation and Usage

This MCP server supports two primary communication methods:

1.  **Stdio (Standard Input/Output):** Ideal for local inter-process communication, command-line tools, and direct integration with applications running on the same machine. This is the default communication method when running the server directly.
2.  **HTTP Stream:** Provides network-based communication, suitable for web-based clients, remote applications, or scenarios requiring real-time updates over HTTP. The HTTP Stream endpoint runs on port `8088` by default.

### Running with Stdio

You can install the package globally and run it:

```bash
npm install -g roam-research-mcp
roam-research-mcp
```

Or clone the repository and build from source:

```bash
git clone https://github.com/2b3pro/roam-research-mcp.git
cd roam-research-mcp
npm install
npm run build
npm start
```

### Running with HTTP Stream

To run the server with HTTP Stream support, you can either:

1.  **Use the default port:** Run `npm start` after building (as shown above). The server will automatically listen on port `8088`.
2.  **Specify a custom port:** Set the `HTTP_STREAM_PORT` environment variable before starting the server.

    ```bash
    HTTP_STREAM_PORT=9000 npm start
    ```

    Or, if using a `.env` file, add `HTTP_STREAM_PORT=9000` to it.

## Docker

This project can be easily containerized using Docker. A `Dockerfile` is provided at the root of the repository.

### Build the Docker Image

To build the Docker image, navigate to the project root and run:

```bash
docker build -t roam-research-mcp .
```

### Run the Docker Container

To run the Docker container and map port 3000 (if your application uses it), you must also provide the necessary environment variables. Use the `-e` flag to pass `ROAM_API_TOKEN`, `ROAM_GRAPH_NAME`, and optionally `MEMORIES_TAG`:

```bash
docker run -p 3000:3000 \
  -e ROAM_API_TOKEN="your-api-token" \
  -e ROAM_GRAPH_NAME="your-graph-name" \
  -e MEMORIES_TAG="#[[LLM/Memories]]" \
  roam-research-mcp
```

Alternatively, if you have a `.env` file in the project root (which is copied into the Docker image during build), you can use the `--env-file` flag:

```bash
docker run -p 3000:3000 --env-file .env roam-research-mcp
```

## To Test

Run [MCP Inspector](https://github.com/modelcontextprotocol/inspector) after build using the provided npm script:

```bash
npm run inspector
```

## Features

The server provides powerful tools for interacting with Roam Research:

- Environment variable handling with .env support
- Comprehensive input validation
- Case-insensitive page title matching
- Recursive block reference resolution
- Markdown parsing and conversion
- Daily page integration
- Detailed debug logging
- Efficient batch operations
- Hierarchical outline creation

1. `roam_fetch_page_by_title`: Fetch page content by title.
2. `roam_create_page`: Create new pages with optional content and headings.
3. `roam_create_block`: Add new blocks to an existing page or today's daily note.
4. `roam_import_markdown`: Import nested markdown content under a specific block.
5. `roam_add_todo`: Add a list of todo items to today's daily page.
6. `roam_create_outline`: Add a structured outline to an existing page or block.
7. `roam_search_block_refs`: Search for block references within a page or across the entire graph.
8. `roam_search_hierarchy`: Search for parent or child blocks in the block hierarchy.
9. `roam_find_pages_modified_today`: Find pages that have been modified today (since midnight).
10. `roam_search_by_text`: Search for blocks containing specific text.
11. `roam_update_block`: Update a single block identified by its UID.
12. `roam_update_multiple_blocks`: Efficiently update multiple blocks in a single batch operation.
13. `roam_search_by_status`: Search for blocks with a specific status (TODO/DONE) across all pages or within a specific page.
14. `roam_search_by_date`: Search for blocks or pages based on creation or modification dates.
15. `roam_search_for_tag`: Search for blocks containing a specific tag and optionally filter by blocks that also contain another tag nearby.
16. `roam_remember`: Add a memory or piece of information to remember.
17. `roam_recall`: Retrieve all stored memories.
18. `roam_datomic_query`: Execute a custom Datomic query on the Roam graph beyond the available search tools.

## Setup

1. Create a [Roam Research API token](https://x.com/RoamResearch/status/1789358175474327881):

   - Go to your graph settings
   - Navigate to the "API tokens" section (Settings > "Graph" tab > "API Tokens" section and click on the "+ New API Token" button)
   - Create a new token

2. Configure the environment variables:
   You have two options for configuring the required environment variables:

   Option 1: Using a .env file (Recommended for development)
   Create a `.env` file in the roam-research directory:

   ```
   ROAM_API_TOKEN=your-api-token
   ROAM_GRAPH_NAME=your-graph-name
   MEMORIES_TAG='#[[LLM/Memories]]'
   HTTP_STREAM_PORT=8088 # Or your desired port for HTTP Stream communication
   ```

   Option 2: Using MCP settings (Alternative method)
   Add the configuration to your MCP settings file. Note that you may need to update the `args` to `["/path/to/roam-research-mcp/build/index.js"]` if you are running the server directly.

   - For Cline (`~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`):
   - For Claude desktop app (`~/Library/Application Support/Claude/claude_desktop_config.json`):

   ```json
   {
     "mcpServers": {
       "roam-research": {
         "command": "node",
         "args": ["/path/to/roam-research-mcp/build/index.js"],
         "env": {
           "ROAM_API_TOKEN": "your-api-token",
           "ROAM_GRAPH_NAME": "your-graph-name",
           "MEMORIES_TAG": "#[[LLM/Memories]]",
           "HTTP_STREAM_PORT": "8088"
         }
       }
     }
   }
   ```

   Note: The server will first try to load from .env file, then fall back to environment variables from MCP settings.

3. Build the server (make sure you're in the root directory of the MCP):
   ```bash
   cd roam-research-mcp
   npm install
   npm run build
   ```

## Error Handling

The server provides comprehensive error handling for common scenarios:

- Configuration errors:
  - Missing API token or graph name
  - Invalid environment variables
- API errors:
  - Authentication failures
  - Invalid requests
  - Failed operations
- Tool-specific errors:
  - Page not found (with case-insensitive search)
  - Block not found by string match
  - Invalid markdown format
  - Missing required parameters
  - Invalid outline structure or content

Each error response includes:

- Standard MCP error code
- Detailed error message
- Suggestions for resolution when applicable

## Development

### Building

To build the server:

```bash
npm install
npm run build
```

This will:

1. Install all required dependencies
2. Compile TypeScript to JavaScript
3. Make the output file executable

You can also use `npm run watch` during development to automatically recompile when files change.

### Testing with MCP Inspector

The MCP Inspector is a tool that helps test and debug MCP servers. To test the server:

```bash
# Inspect with npx:
npx @modelcontextprotocol/inspector node build/index.js
```

This will:

1. Start the server in inspector mode
2. Provide an interactive interface to:
   - List available tools and resources
   - Execute tools with custom parameters
   - View tool responses and error handling

## License

MIT License
