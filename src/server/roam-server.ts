import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { initializeGraph, type Graph } from '@roam-research/roam-api-sdk';
import { API_TOKEN, GRAPH_NAME } from '../config/environment.js';
import { toolSchemas } from '../tools/schemas.js';
import { ToolHandlers } from '../tools/handlers.js';
import { TagSearchHandler, BlockRefSearchHandler, HierarchySearchHandler } from '../search/index.js';

export class RoamServer {
  private server: Server;
  private toolHandlers: ToolHandlers;
  private graph: Graph;

  constructor() {
    this.graph = initializeGraph({
      token: API_TOKEN,
      graph: GRAPH_NAME,
    });

    this.toolHandlers = new ToolHandlers(this.graph);
    
    this.server = new Server(
      {
        name: 'roam-research',
        version: '0.12.1',
      },
      {
          capabilities: {
            tools: {
              roam_add_todo: {},
              roam_fetch_page_by_title: {},
              roam_create_page: {},
              roam_create_block: {},
              roam_import_markdown: {},
              roam_create_outline: {},
              roam_search_for_tag: {},
              roam_search_by_status: {},
              roam_search_block_refs: {},
              roam_search_hierarchy: {}
            },
          },
      }
    );

    this.setupRequestHandlers();
    
    // Error handling
    this.server.onerror = (error) => { /* handle error silently */ };
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupRequestHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: Object.values(toolSchemas),
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case 'roam_fetch_page_by_title': {
            const { title } = request.params.arguments as { title: string };
            const content = await this.toolHandlers.fetchPageByTitle(title);
            return {
              content: [{ type: 'text', text: content }],
            };
          }

          case 'roam_create_page': {
            const { title, content } = request.params.arguments as { 
              title: string; 
              content?: string 
            };
            const result = await this.toolHandlers.createPage(title, content);
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          }

          case 'roam_create_block': {
            const { content, page_uid, title } = request.params.arguments as {
              content: string;
              page_uid?: string;
              title?: string;
            };
            const result = await this.toolHandlers.createBlock(content, page_uid, title);
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          }

          case 'roam_import_markdown': {
            const { 
              content,
              page_uid,
              page_title,
              parent_uid,
              parent_string,
              order = 'first'
            } = request.params.arguments as {
              content: string;
              page_uid?: string;
              page_title?: string;
              parent_uid?: string;
              parent_string?: string;
              order?: 'first' | 'last';
            };
            const result = await this.toolHandlers.importMarkdown(
              content,
              page_uid,
              page_title,
              parent_uid,
              parent_string,
              order
            );
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          }

          case 'roam_add_todo': {
            const { todos } = request.params.arguments as { todos: string[] };
            const result = await this.toolHandlers.addTodos(todos);
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          }

          case 'roam_create_outline': {
            const { outline, page_title_uid, block_text_uid } = request.params.arguments as {
              outline: Array<{text: string | undefined; level: number}>;
              page_title_uid?: string;
              block_text_uid?: string;
            };
            const result = await this.toolHandlers.createOutline(
              outline,
              page_title_uid,
              block_text_uid
            );
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          }

          case 'roam_search_for_tag': {
            const params = request.params.arguments as {
              primary_tag: string;
              page_title_uid?: string;
              near_tag?: string;
            };
            const handler = new TagSearchHandler(this.graph, params);
            const result = await handler.execute();
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          }

          case 'roam_search_by_status': {
            const { status, page_title_uid, include, exclude } = request.params.arguments as {
              status: 'TODO' | 'DONE';
              page_title_uid?: string;
              include?: string;
              exclude?: string;
            };
            const result = await this.toolHandlers.searchByStatus(status, page_title_uid, include, exclude);
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          }

          case 'roam_search_block_refs': {
            const params = request.params.arguments as {
              block_uid?: string;
              page_title_uid?: string;
            };
            const handler = new BlockRefSearchHandler(this.graph, params);
            const result = await handler.execute();
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          }

          case 'roam_search_hierarchy': {
            const params = request.params.arguments as {
              parent_uid?: string;
              child_uid?: string;
              page_title_uid?: string;
              max_depth?: number;
            };
            const handler = new HierarchySearchHandler(this.graph, params);
            const result = await handler.execute();
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
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
  }
}
