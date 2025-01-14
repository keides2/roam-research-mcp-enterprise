// Tool definitions and input schemas for Roam Research MCP server
export const toolSchemas = {
  roam_add_todo: {
    name: 'roam_add_todo',
    description: 'Add a list of todo items as individual blocks to today\'s daily page in Roam. Each item becomes its own actionable block with todo status.\nNOTE on Roam-flavored markdown: For direct linking: use [[link]] syntax. For aliased linking, use [alias]([[link]]) syntax. Do not concatenate words in links/hashtags - correct: #[[multiple words]] #self-esteem (for typically hyphenated words).',
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
    description: 'Add a new block to an existing Roam page. If no page specified, adds to today\'s daily note. Best for capturing immediate thoughts, additions to discussions, or content that doesn\'t warrant its own page. Can specify page by title or UID.\nNOTE on Roam-flavored markdown: For direct linking: use [[link]] syntax. For aliased linking, use [alias]([[link]]) syntax. Do not concatenate words in links/hashtags - correct: #[[multiple words]] #self-esteem (for typically hyphenated words).',
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
    description: 'Create a structured outline with nested structure in Roam from an array of items with explicit levels. Can be added on a specific page or under a specific block. Ideal for saving a conversation with an LLM response, research, or organizing thoughts.',
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
                description: 'Indentation level (1-10, where 1 is top level)',
                minimum: 1,
                maximum: 10
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
  roam_search_for_tag: {
    name: 'roam_search_for_tag',
    description: 'Search for blocks containing a specific tag and optionally filter by blocks that also contain another tag nearby. Example: Use this to search for memories that are tagged with the MEMORIES_TAG.',
    inputSchema: {
      type: 'object',
      properties: {
        primary_tag: {
          type: 'string',
          description: 'The main tag to search for (without the [[ ]] brackets)',
        },
        page_title_uid: {
          type: 'string',
          description: 'Optional: Title or UID of the page to search in. Defaults to today\'s daily page if not provided',
        },
        near_tag: {
          type: 'string',
          description: 'Optional: Another tag to filter results by - will only return blocks where both tags appear',
        }
      },
      required: ['primary_tag']
    }
  },
  roam_search_by_status: {
    name: 'roam_search_by_status',
    description: 'Search for blocks with a specific status (TODO/DONE) across all pages or within a specific page.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Status to search for (TODO or DONE)',
          enum: ['TODO', 'DONE']
        },
        page_title_uid: {
          type: 'string',
          description: 'Optional: Title or UID of the page to search in. If not provided, searches across all pages'
        },
        include: {
          type: 'string',
          description: 'Optional: Comma-separated list of terms to filter results by inclusion (matches content or page title)'
        },
        exclude: {
          type: 'string',
          description: 'Optional: Comma-separated list of terms to filter results by exclusion (matches content or page title)'
        }
      },
      required: ['status']
    }
  },
  roam_search_block_refs: {
    name: 'roam_search_block_refs',
    description: 'Search for block references within a page or across the entire graph. Can search for references to a specific block or find all block references.',
    inputSchema: {
      type: 'object',
      properties: {
        block_uid: {
          type: 'string',
          description: 'Optional: UID of the block to find references to'
        },
        page_title_uid: {
          type: 'string',
          description: 'Optional: Title or UID of the page to search in. If not provided, searches across all pages'
        }
      }
    }
  },
  roam_search_hierarchy: {
    name: 'roam_search_hierarchy',
    description: 'Search for parent or child blocks in the block hierarchy. Can search up or down the hierarchy from a given block.',
    inputSchema: {
      type: 'object',
      properties: {
        parent_uid: {
          type: 'string',
          description: 'Optional: UID of the block to find children of'
        },
        child_uid: {
          type: 'string',
          description: 'Optional: UID of the block to find parents of'
        },
        page_title_uid: {
          type: 'string',
          description: 'Optional: Title or UID of the page to search in'
        },
        max_depth: {
          type: 'integer',
          description: 'Optional: How many levels deep to search (default: 1)',
          minimum: 1,
          maximum: 10
        }
      },
      oneOf: [
        { required: ['parent_uid'] },
        { required: ['child_uid'] }
      ]
    }
  },
  find_pages_modified_today: {
    name: 'find_pages_modified_today',
    description: 'Find all pages that have been modified today (since midnight).',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  roam_search_by_text: {
    name: 'roam_search_by_text',
    description: 'Search for blocks containing specific text across all pages or within a specific page.',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The text to search for'
        },
        page_title_uid: {
          type: 'string',
          description: 'Optional: Title or UID of the page to search in. If not provided, searches across all pages'
        }
      },
      required: ['text']
    }
  },
  roam_update_block: {
    name: 'roam_update_block',
    description: 'Update the content of an existing block identified by its UID. Can either provide new content directly or use a transform pattern to modify existing content.\nNOTE on Roam-flavored markdown: For direct linking: use [[link]] syntax. For aliased linking, use [alias]([[link]]) syntax. Do not concatenate words in links/hashtags - correct: #[[multiple words]] #self-esteem (for typically hyphenated words).',
    inputSchema: {
      type: 'object',
      properties: {
        block_uid: {
          type: 'string',
          description: 'UID of the block to update'
        },
        content: {
          type: 'string',
          description: 'New content for the block. If not provided, transform_pattern will be used.'
        },
        transform_pattern: {
          type: 'object',
          description: 'Pattern to transform the current content. Used if content is not provided.',
          properties: {
            find: {
              type: 'string',
              description: 'Text or regex pattern to find'
            },
            replace: {
              type: 'string',
              description: 'Text to replace with'
            },
            global: {
              type: 'boolean',
              description: 'Whether to replace all occurrences',
              default: true
            }
          },
          required: ['find', 'replace']
        }
      },
      required: ['block_uid'],
      oneOf: [
        { required: ['content'] },
        { required: ['transform_pattern'] }
      ]
    }
  },
  roam_update_blocks: {
    name: 'roam_update_blocks',
    description: 'Update multiple blocks in a single batch operation. Each update can provide either new content directly or a transform pattern.\nNOTE on Roam-flavored markdown: For direct linking: use [[link]] syntax. For aliased linking, use [alias]([[link]]) syntax. Do not concatenate words in links/hashtags - correct: #[[multiple words]] #self-esteem (for typically hyphenated words).',
    inputSchema: {
      type: 'object',
      properties: {
        updates: {
          type: 'array',
          description: 'Array of block updates to perform',
          items: {
            type: 'object',
            properties: {
              block_uid: {
                type: 'string',
                description: 'UID of the block to update'
              },
              content: {
                type: 'string',
                description: 'New content for the block. If not provided, transform will be used.'
              },
              transform: {
                type: 'object',
                description: 'Pattern to transform the current content. Used if content is not provided.',
                properties: {
                  find: {
                    type: 'string',
                    description: 'Text or regex pattern to find'
                  },
                  replace: {
                    type: 'string',
                    description: 'Text to replace with'
                  },
                  global: {
                    type: 'boolean',
                    description: 'Whether to replace all occurrences',
                    default: true
                  }
                },
                required: ['find', 'replace']
              }
            },
            required: ['block_uid'],
            oneOf: [
              { required: ['content'] },
              { required: ['transform'] }
            ]
          }
        }
      },
      required: ['updates']
    }
  },
  roam_search_by_date: {
    name: 'roam_search_by_date',
    description: 'Search for blocks or pages based on creation or modification dates',
    inputSchema: {
      type: 'object',
      properties: {
        start_date: {
          type: 'string',
          description: 'Start date in ISO format (YYYY-MM-DD)',
        },
        end_date: {
          type: 'string',
          description: 'Optional: End date in ISO format (YYYY-MM-DD)',
        },
        type: {
          type: 'string',
          enum: ['created', 'modified', 'both'],
          description: 'Whether to search by creation date, modification date, or both',
        },
        scope: {
          type: 'string',
          enum: ['blocks', 'pages', 'both'],
          description: 'Whether to search blocks, pages, or both',
        },
        include_content: {
          type: 'boolean',
          description: 'Whether to include the content of matching blocks/pages',
          default: true,
        }
      },
      required: ['start_date', 'type', 'scope']
    }
  },
  roam_remember: {
    name: 'roam_remember',
    description: 'Add a memory or piece of information to remember, stored on the daily page with #[[LLM/Memories]] tag and optional categories. Use roam_search_for_tag with "LLM/Memories" to find stored memories.\nNOTE on Roam-flavored markdown: For direct linking: use [[link]] syntax. For aliased linking, use [alias]([[link]]) syntax. Do not concatenate words in links/hashtags - correct: #[[multiple words]] #self-esteem (for typically hyphenated words).',
    inputSchema: {
      type: 'object',
      properties: {
        memory: {
          type: 'string',
          description: 'The memory or information to remember'
        },
        categories: {
          type: 'array',
          items: {
            type: 'string'
          },
          description: 'Optional categories to tag the memory with (will be converted to Roam tags)'
        }
      },
      required: ['memory']
    }
  },
  roam_recall: {
    name: 'roam_recall',
    description: 'Retrieve all stored memories by searching for blocks tagged with MEMORIES_TAG and content from the page with the same name. Returns a combined, deduplicated list of memories.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  }
};
