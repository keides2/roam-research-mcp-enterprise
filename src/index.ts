#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { 
  initializeGraph, 
  q, 
  createPage, 
  createBlock,
  updateBlock,
  deleteBlock,
  deletePage,
  moveBlock,
  pull,
  batchActions,
} from '@roam-research/roam-api-sdk';
import type { Graph } from '@roam-research/roam-api-sdk';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

// Get the project root from the script path
const scriptPath = process.argv[1];  // Full path to the running script
const projectRoot = dirname(dirname(scriptPath));  // Go up two levels from build/index.js

console.error('Script path:', scriptPath);
console.error('Project root:', projectRoot);

// Try to load .env from project root
const envPath = join(projectRoot, '.env');
console.error(`Looking for .env file at: ${envPath}`);

if (existsSync(envPath)) {
  console.error(`Found .env file at: ${envPath}`);
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.error('Error loading .env file:', result.error);
  } else {
    console.error('Successfully loaded .env file');
  }
} else {
  console.error('No .env file found');
}


const API_TOKEN = process.env.ROAM_API_TOKEN as string;
const GRAPH_NAME = process.env.ROAM_GRAPH_NAME as string;

if (!API_TOKEN || !GRAPH_NAME) {
  const missingVars = [];
  if (!API_TOKEN) missingVars.push('ROAM_API_TOKEN');
  if (!GRAPH_NAME) missingVars.push('ROAM_GRAPH_NAME');

  throw new Error(
    `Missing required environment variables: ${missingVars.join(', ')}\n\n` +
    'Please configure these variables either:\n' +
    '1. In your MCP settings file:\n' +
    '   - For Cline: ~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json\n' +
    '   - For Claude: ~/Library/Application Support/Claude/claude_desktop_config.json\n\n' +
    '   Example configuration:\n' +
    '   {\n' +
    '     "mcpServers": {\n' +
    '       "roam-research": {\n' +
    '         "command": "node",\n' +
    '         "args": ["/path/to/roam-research/build/index.js"],\n' +
    '         "env": {\n' +
    '           "ROAM_API_TOKEN": "your-api-token",\n' +
    '           "ROAM_GRAPH_NAME": "your-graph-name"\n' +
    '         }\n' +
    '       }\n' +
    '     }\n' +
    '   }\n\n' +
    '2. Or in a .env file in the roam-research directory:\n' +
    '   ROAM_API_TOKEN=your-api-token\n' +
    '   ROAM_GRAPH_NAME=your-graph-name'
  );
}

class RoamServer {
  private server: Server;
  private graph: Graph;

  constructor() {
    this.graph = initializeGraph({
      token: API_TOKEN,
      graph: GRAPH_NAME,
    });
    this.server = new Server(
      {
        name: 'roam-research',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {
            search_blocks: {},
            create_page: {},
            create_block: {},
            pull_data: {},
            pull_many_data: {},
            move_block: {},
            update_block: {},
            delete_block: {},
            delete_page: {},
            batch_actions: {}
          },
        },
      }
    );

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // Search blocks
        {
          name: 'search_blocks',
          description: 'Search for blocks containing specific text',
          inputSchema: {
            type: 'object',
            properties: {
              search_string: {
                type: 'string',
                description: 'Text to search for in blocks',
              },
            },
            required: ['search_string'],
          },
        },
        // Create page
        {
          name: 'create_page',
          description: 'Create a new page in Roam',
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
        // Create block
        {
          name: 'create_block',
          description: 'Create a new block in a page',
          inputSchema: {
            type: 'object',
            properties: {
              page_uid: {
                type: 'string',
                description: 'UID of the page to add block to',
              },
              content: {
                type: 'string',
                description: 'Content of the block',
              },
            },
            required: ['page_uid', 'content'],
          },
        },
        // Pull data
        {
          name: 'pull_data',
          description: 'Get data for a specific block or page',
          inputSchema: {
            type: 'object',
            properties: {
              pattern: {
                type: 'string',
                description: 'Pull pattern (e.g., "[*]" for all data)',
              },
              uid: {
                type: 'string',
                description: 'UID of the block or page',
              },
            },
            required: ['pattern', 'uid'],
          },
        },
        // Pull many
        {
          name: 'pull_many_data',
          description: 'Get data for multiple blocks or pages',
          inputSchema: {
            type: 'object',
            properties: {
              pattern: {
                type: 'string',
                description: 'Pull pattern (e.g., "[*]" for all data)',
              },
              uids: {
                type: 'string',
                description: 'Comma-separated UIDs of blocks or pages',
              },
            },
            required: ['pattern', 'uids'],
          },
        },
        // Move block
        {
          name: 'move_block',
          description: 'Move a block to a new location',
          inputSchema: {
            type: 'object',
            properties: {
              block_uid: {
                type: 'string',
                description: 'UID of the block to move',
              },
              parent_uid: {
                type: 'string',
                description: 'UID of the new parent block/page',
              },
              order: {
                type: 'string',
                description: 'Position in new location ("first", "last", or number)',
              },
            },
            required: ['block_uid', 'parent_uid', 'order'],
          },
        },
        // Update block
        {
          name: 'update_block',
          description: 'Update block content and properties',
          inputSchema: {
            type: 'object',
            properties: {
              uid: {
                type: 'string',
                description: 'UID of the block to update',
              },
              content: {
                type: 'string',
                description: 'New content for the block',
              },
              open: {
                type: 'boolean',
                description: 'Whether the block is expanded (optional)',
              },
              heading: {
                type: 'number',
                description: 'Heading level (1-3, optional)',
              },
            },
            required: ['uid', 'content'],
          },
        },
        // Delete block
        {
          name: 'delete_block',
          description: 'Delete a block',
          inputSchema: {
            type: 'object',
            properties: {
              uid: {
                type: 'string',
                description: 'UID of the block to delete',
              },
            },
            required: ['uid'],
          },
        },
        // Delete page
        {
          name: 'delete_page',
          description: 'Delete a page',
          inputSchema: {
            type: 'object',
            properties: {
              uid: {
                type: 'string',
                description: 'UID of the page to delete',
              },
            },
            required: ['uid'],
          },
        },
        // Batch actions
        {
          name: 'batch_actions',
          description: 'Perform multiple operations at once',
          inputSchema: {
            type: 'object',
            properties: {
              actions: {
                type: 'array',
                description: 'Array of actions to perform',
                items: {
                  type: 'object',
                  properties: {
                    type: {
                      type: 'string',
                      description: 'Type of action (create-page, create-block, update-block, delete-block, delete-page, move-block)',
                    },
                    data: {
                      type: 'object',
                      description: 'Action-specific data',
                    },
                  },
                  required: ['type', 'data'],
                },
              },
            },
            required: ['actions'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case 'search_blocks': {
            const { search_string } = request.params.arguments as { search_string: string };
            const query = `[:find ?block-uid ?block-str 
                          :in $ ?search-string 
                          :where [?b :block/uid ?block-uid] 
                                [?b :block/string ?block-str] 
                                [(clojure.string/includes? ?block-str ?search-string)]]`;
            const results = await q(this.graph, query, [search_string]);
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(results, null, 2),
                },
              ],
            };
          }

          case 'create_page': {
            const { title, content } = request.params.arguments as { title: string; content?: string };
            // Ensure title is properly formatted
            const pageTitle = String(title).trim();
            
            // First try to find if the page exists
            const findQuery = `[:find ?uid :in $ ?title :where [?e :node/title ?title] [?e :block/uid ?uid]]`;
            const findResults = await q(this.graph, findQuery, [pageTitle]);
            
            let pageUid;
            
            if (findResults && findResults.length > 0) {
              // Page exists, use its UID
              pageUid = findResults[0][0];
            } else {
              // Create new page
              const success = await createPage(this.graph, {
                action: 'create-page',
                page: {
                  title: pageTitle
                }
              });

              if (!success) {
                throw new Error('Failed to create page');
              }

              // Get the new page's UID
              const results = await q(this.graph, findQuery, [pageTitle]);
              if (!results || results.length === 0) {
                throw new Error('Could not find created page');
              }
              pageUid = results[0][0];
            }

            // If content is provided, create a block in the new page
            if (content) {
              const blockSuccess = await createBlock(this.graph, {
                action: 'create-block',
                location: { 
                  "parent-uid": pageUid,
                  "order": "first"
                },
                block: { string: content }
              });

              if (!blockSuccess) {
                throw new Error('Failed to create content block');
              }
            }
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ success: true, uid: pageUid }, null, 2),
                },
              ],
            };
          }

          case 'create_block': {
            const { page_uid, content } = request.params.arguments as { page_uid: string; content: string };
            const success = await createBlock(this.graph, {
              action: 'create-block',
              location: { 
                "parent-uid": page_uid,
                "order": "last"
              },
              block: { string: content }
            });
            
            if (!success) {
              throw new Error('Failed to create block');
            }
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ success: true }, null, 2),
                },
              ],
            };
          }

          case 'pull_data': {
            const { pattern, uid } = request.params.arguments as { pattern: string; uid: string };
            const result = await pull(this.graph, pattern, uid);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'pull_many_data': {
            const { pattern, uids } = request.params.arguments as { pattern: string; uids: string };
            const uidArray = uids.split(',');
            const results = await Promise.all(
              uidArray.map(uid => pull(this.graph, pattern, uid))
            );
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(results, null, 2),
                },
              ],
            };
          }

          case 'move_block': {
            const { block_uid, parent_uid, order } = request.params.arguments as { 
              block_uid: string; 
              parent_uid: string;
              order: string | number;
            };
            const success = await moveBlock(this.graph, {
              action: 'move-block',
              location: {
                'parent-uid': parent_uid,
                order,
              },
              block: {
                uid: block_uid,
              },
            });
            
            if (!success) {
              throw new Error('Failed to move block');
            }
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ success: true }, null, 2),
                },
              ],
            };
          }

          case 'update_block': {
            const { uid, content, open, heading } = request.params.arguments as {
              uid: string;
              content: string;
              open?: boolean;
              heading?: number;
            };
            const success = await updateBlock(this.graph, {
              action: 'update-block',
              block: {
                uid,
                string: content,
                ...(open !== undefined && { open }),
                ...(heading !== undefined && { heading }),
              },
            });
            
            if (!success) {
              throw new Error('Failed to update block');
            }
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ success: true }, null, 2),
                },
              ],
            };
          }

          case 'delete_block': {
            const { uid } = request.params.arguments as { uid: string };
            const success = await deleteBlock(this.graph, {
              action: 'delete-block',
              block: { uid },
            });
            
            if (!success) {
              throw new Error('Failed to delete block');
            }
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ success: true }, null, 2),
                },
              ],
            };
          }

          case 'delete_page': {
            const { uid } = request.params.arguments as { uid: string };
            const success = await deletePage(this.graph, {
              action: 'delete-page',
              page: { uid },
            });
            
            if (!success) {
              throw new Error('Failed to delete page');
            }
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ success: true }, null, 2),
                },
              ],
            };
          }

          case 'batch_actions': {
            const { actions } = request.params.arguments as { 
              actions: Array<{
                type: string;
                data: any;
              }>;
            };

            const formattedActions = actions.map(action => {
              switch (action.type) {
                case 'create-page':
                  return {
                    action: 'create-page',
                    page: action.data,
                  };
                case 'create-block':
                  return {
                    action: 'create-block',
                    location: action.data.location,
                    block: action.data.block,
                  };
                case 'update-block':
                  return {
                    action: 'update-block',
                    block: action.data,
                  };
                case 'delete-block':
                  return {
                    action: 'delete-block',
                    block: action.data,
                  };
                case 'delete-page':
                  return {
                    action: 'delete-page',
                    page: action.data,
                  };
                case 'move-block':
                  return {
                    action: 'move-block',
                    location: action.data.location,
                    block: action.data.block,
                  };
                default:
                  throw new Error(`Unknown action type: ${action.type}`);
              }
            });

            const result = await batchActions(this.graph, {
              action: 'batch-actions',
              actions: formattedActions,
            });

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error: unknown) {
        if (error instanceof McpError) {
          throw error;
        }
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new McpError(
          ErrorCode.InternalError,
          `Roam API error: ${errorMessage}`
        );
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Roam Research MCP server running on stdio');
  }
}

const server = new RoamServer();
server.run().catch(console.error);
