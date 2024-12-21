# Roam Research MCP Server

[![npm version](https://badge.fury.io/js/roam-research-mcp.svg)](https://badge.fury.io/js/roam-research-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub](https://img.shields.io/github/license/2b3pro/roam-research-mcp)](https://github.com/2b3pro/roam-research-mcp/blob/main/LICENSE)

A Model Context Protocol (MCP) server that provides comprehensive access to Roam Research's API functionality. This server enables AI assistants like Claude to interact with your Roam Research graph through a standardized interface.

## Installation

You can install the package globally:

```bash
npm install -g roam-research-mcp
```

Or clone the repository and build from source:

```bash
git clone https://github.com/2b3pro/roam-research-mcp.git
cd roam-research-mcp
npm install
npm run build
```

## Features

The server provides five powerful tools for interacting with Roam Research:

1. `fetch_page_by_title`: Fetch and read a page's content by title, recursively resolving block references up to 4 levels deep
2. `create_page`: Create new pages with optional content
3. `create_block`: Create new blocks in a page (defaults to today's daily page)
4. `import_nested_markdown`: Import nested markdown content into Roam as blocks
5. `add_todo`: Add multiple todo items to today's daily page with checkbox syntax

## Setup

1. Create a Roam Research API token:

   - Go to your graph settings
   - Navigate to the "API tokens" section
   - Create a new token

2. Configure the environment variables:
   You have two options for configuring the required environment variables:

   Option 1: Using a .env file (Recommended for development)
   Create a `.env` file in the roam-research directory:

   ```
   ROAM_API_TOKEN=your-api-token
   ROAM_GRAPH_NAME=your-graph-name
   ```

   Option 2: Using MCP settings (Alternative method)
   Add the configuration to your MCP settings file:

   - For Cline (`~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`):

   ```json
   {
     "mcpServers": {
       "roam-research": {
         "command": "node",
         "args": ["/path/to/roam-research/build/index.js"],
         "env": {
           "ROAM_API_TOKEN": "your-api-token",
           "ROAM_GRAPH_NAME": "your-graph-name"
         }
       }
     }
   }
   ```

   - For Claude desktop app (`~/Library/Application Support/Claude/claude_desktop_config.json`):

   ```json
   {
     "mcpServers": {
       "roam-research": {
         "command": "node",
         "args": ["/path/to/roam-research/build/index.js"],
         "env": {
           "ROAM_API_TOKEN": "your-api-token",
           "ROAM_GRAPH_NAME": "your-graph-name"
         }
       }
     }
   }
   ```

   Note: The server will first try to load from .env file, then fall back to environment variables from MCP settings.

3. Build the server:
   ```bash
   cd roam-research
   npm install
   npm run build
   ```

## Usage

### Fetch Page By Title

Fetch and read a page's content with resolved block references:

```typescript
use_mcp_tool roam-research fetch_page_by_title {
  "title": "Example Page"
}
```

Returns the page content as markdown with:

- Complete hierarchical structure
- Block references recursively resolved (up to 4 levels deep)
- Proper indentation for nesting levels
- Full markdown formatting

### Create Page

Create a new page with optional content:

```typescript
use_mcp_tool roam-research create_page {
  "title": "New Page",
  "content": "Initial content for the page"
}
```

Returns the created page's UID on success.

### Create Block

Add a new block to a page (defaults to today's daily page if neither page_uid nor title provided):

```typescript
use_mcp_tool roam-research create_block {
  "content": "Block content",
  "page_uid": "optional-target-page-uid",
  "title": "optional-target-page-title"
}
```

You can specify either:

- `page_uid`: Direct reference to target page
- `title`: Name of target page (will be created if it doesn't exist)
- Neither: Block will be added to today's daily page

### Add Todo Items

Add one or more todo items to today's daily page:

```typescript
use_mcp_tool roam-research add_todo {
  "todos": [
    "First todo item",
    "Second todo item",
    "Third todo item"
  ]
}
```

Features:

- Adds todos with Roam checkbox syntax (`{{TODO}} todo text`)
- Supports adding multiple todos in a single operation
- Uses batch actions for efficiency when adding >10 todos
- Automatically creates today's page if it doesn't exist
- Adds todos as top-level blocks in sequential order

### Import Nested Markdown

Import nested markdown content into Roam as blocks:

```typescript
use_mcp_tool roam-research import_nested_markdown {
  "title": "Optional page title (defaults to today's date)",
  "markdown": "# Heading\n- Item 1\n  - Subitem A\n  - Subitem B\n- Item 2",
  "order": "last"
}
```

Features:

- Supports headings (# to ######)
- Supports bullet points (\* + -)
- Supports numbered lists
- Preserves hierarchical structure
- Creates page if it doesn't exist
- Returns created block UIDs

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
  - Invalid markdown format
  - Missing required parameters

Each error response includes:

- Standard MCP error code
- Detailed error message
- Suggestions for resolution when applicable

## Development

The server is built with TypeScript and includes:

- Environment variable handling with .env support
- Comprehensive input validation
- Case-insensitive page title matching
- Recursive block reference resolution
- Markdown parsing and conversion
- Daily page integration
- Detailed debug logging

To modify or extend the server:

1. Clone the repository
2. Install dependencies with `npm install`
3. Make changes to the source files
4. Build with `npm run build`
5. Test locally by configuring environment variables

## License

MIT License
