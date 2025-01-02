// Tool definitions and input schemas for Roam Research MCP server
export const toolSchemas = {
  roam_add_todo: {
    name: 'roam_add_todo',
    description: 'Add a list of todo items as individual blocks to today\'s daily page in Roam. Each item becomes its own actionable block with todo status.',
    inputSchema: {
      type: 'object',
      properties: {
        todos: {
          type: 'array',
          items: {
            type: 'string',
            description: 'Todo item text'
          },
          description: 'List of todo items to add'
        }
      },
      required: ['todos'],
    },
  },
  roam_fetch_page_by_title: {
    name: 'roam_fetch_page_by_title',
    description: 'Retrieve complete page contents by exact title, including all nested blocks and resolved block references. Use for reading and analyzing existing Roam pages.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Title of the page to fetch and read',
        },
      },
      required: ['title'],
    },
  },
  roam_create_page: {
    name: 'roam_create_page',
    description: 'Create a new standalone page in Roam from markdown with given title. Best for hierarchical content, reference materials, markdown tables, and topics that deserve their own namespace. Optional initial content will be properly nested as blocks.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Title of the new page',
        },
        content: {
          type: 'string',
          description: 'Initial content for the page (optional)',
        },
      },
      required: ['title'],
    },
  },
  roam_create_block: {
    name: 'roam_create_block',
    description: 'Add a new block to an existing Roam page. If no page specified, adds to today\'s daily note. Best for capturing immediate thoughts, additions to discussions, or content that doesn\'t warrant its own page. Can specify page by title or UID.',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'Content of the block',
        },
        page_uid: {
          type: 'string',
          description: 'Optional: UID of the page to add block to',
        },
        title: {
          type: 'string',
          description: 'Optional: Title of the page to add block to (defaults to today\'s date if neither page_uid nor title provided)',
        },
      },
      required: ['content'],
    },
  },
  roam_create_outline: {
    name: 'roam_create_outline',
    description: 'Create a structured outline in Roam from an array of outline items with explicit levels. Can be added under a specific page or block.',
    inputSchema: {
      type: 'object',
      properties: {
        page_title_uid: {
          type: 'string',
          description: 'Title (or UID if known) of the page. Leave blank to use the default daily page'
        },
        block_text_uid: {
          type: 'string',
          description: 'A relevant title heading for the outline (or UID, if known) of the block under which outline content will be nested. If blank, content will be nested under the page title.'
        },
        outline: {
          type: 'array',
          description: 'Array of outline items with block text and level',
          items: {
            type: 'object',
            properties: {
              text: {
                type: 'string',
                description: 'Content of the block'
              },
              level: {
                type: 'integer',
                description: 'Indentation level (1-5, where 1 is top level)'
              }
            },
            required: ['text', 'level']
          }
        }
      },
      required: ['outline']
    }
  },
  roam_import_markdown: {
    name: 'roam_import_markdown',
    description: 'Import nested markdown content into Roam under a specific block. Can locate the parent block by UID or by exact string match within a specific page.',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'Nested markdown content to import'
        },
        page_uid: {
          type: 'string',
          description: 'Optional: UID of the page containing the parent block'
        },
        page_title: {
          type: 'string',
          description: 'Optional: Title of the page containing the parent block (ignored if page_uid provided)'
        },
        parent_uid: {
          type: 'string',
          description: 'Optional: UID of the parent block to add content under'
        },
        parent_string: {
          type: 'string',
          description: 'Optional: Exact string content of the parent block to add content under (must provide either page_uid or page_title)'
        },
        order: {
          type: 'string',
          description: 'Optional: Where to add the content under the parent ("first" or "last")',
          enum: ['first', 'last'],
          default: 'first'
        }
      },
      required: ['content']
    }
  },
};
