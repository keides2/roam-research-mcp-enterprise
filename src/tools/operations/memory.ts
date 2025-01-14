import { Graph, q, createBlock, createPage } from '@roam-research/roam-api-sdk';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { formatRoamDate } from '../../utils/helpers.js';
import { resolveRefs } from '../helpers/refs.js';
import { SearchOperations } from './search/index.js';
import type { SearchResult } from '../types/index.js';

export class MemoryOperations {
  private searchOps: SearchOperations;

  constructor(private graph: Graph) {
    this.searchOps = new SearchOperations(graph);
  }

  async remember(memory: string, categories?: string[]): Promise<{ success: boolean }> {
    // Get today's date
    const today = new Date();
    const dateStr = formatRoamDate(today);
    
    // Try to find today's page
    const findQuery = `[:find ?uid :in $ ?title :where [?e :node/title ?title] [?e :block/uid ?uid]]`;
    const findResults = await q(this.graph, findQuery, [dateStr]) as [string][];
    
    let pageUid: string;
    
    if (findResults && findResults.length > 0) {
      pageUid = findResults[0][0];
    } else {
      // Create today's page if it doesn't exist
      try {
        await createPage(this.graph, {
          action: 'create-page',
          page: { title: dateStr }
        });

        // Get the new page's UID
        const results = await q(this.graph, findQuery, [dateStr]) as [string][];
        if (!results || results.length === 0) {
          throw new McpError(
            ErrorCode.InternalError,
            'Could not find created today\'s page'
          );
        }
        pageUid = results[0][0];
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          'Failed to create today\'s page'
        );
      }
    }

    // Get memories tag from environment
    const memoriesTag = process.env.MEMORIES_TAG;
    if (!memoriesTag) {
      throw new McpError(
        ErrorCode.InternalError,
        'MEMORIES_TAG environment variable not set'
      );
    }

    // Format categories as Roam tags if provided
    const categoryTags = categories?.map(cat => {
      // Handle multi-word categories
      return cat.includes(' ') ? `#[[${cat}]]` : `#${cat}`;
    }).join(' ') || '';

    // Create block with memory, memories tag, and optional categories
    const blockContent = `${memoriesTag} ${memory} ${categoryTags}`.trim();
    
    try {
      await createBlock(this.graph, {
        action: 'create-block',
        location: { 
          "parent-uid": pageUid,
          "order": "last"
        },
        block: { string: blockContent }
      });
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        'Failed to create memory block'
      );
    }

    return { success: true };
  }

  async recall(): Promise<{ success: boolean; memories: string[] }> {
    // Get memories tag from environment
    const memoriesTag = process.env.MEMORIES_TAG;
    if (!memoriesTag) {
      throw new McpError(
        ErrorCode.InternalError,
        'MEMORIES_TAG environment variable not set'
      );
    }

    // Extract the tag text, removing any formatting
    const tagText = memoriesTag
      .replace(/^#/, '')  // Remove leading #
      .replace(/^\[\[/, '').replace(/\]\]$/, '');  // Remove [[ and ]]

    // Get results from tag search
    const tagResults = await this.searchOps.searchForTag(tagText);
    
    // Get blocks from the memories page
    const pageQuery = `[:find ?string
                       :in $ ?title
                       :where [?p :node/title ?title]
                              [?b :block/page ?p]
                              [?b :block/string ?string]]`;
    const pageResults = await q(this.graph, pageQuery, [tagText]) as [string][];
    
    // Combine both sets of results and remove the memories tag
    const allMemories = [
      ...tagResults.matches.map((match: SearchResult) => match.content),
      ...pageResults.map(([content]) => content)
    ].map(content => content.replace(`${memoriesTag} `, ''));
    
    // Resolve any block references in the combined memories
    const resolvedMemories = await Promise.all(
      allMemories.map(async (content) => resolveRefs(this.graph, content))
    );
    
    // Remove duplicates
    const uniqueMemories = [...new Set(resolvedMemories)];
    
    return {
      success: true,
      memories: uniqueMemories
    };
  }
}
