import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { 
  q, 
  createPage, 
  createBlock,
  batchActions,
} from '@roam-research/roam-api-sdk';
import type { Graph, RoamCreateBlock } from '@roam-research/roam-api-sdk';
import type { RoamBlock } from '../types/roam.js';
import { formatRoamDate } from '../utils/helpers.js';
import { 
  parseMarkdown, 
  convertToRoamActions,
  convertToRoamMarkdown,
  hasMarkdownTable,
  type BatchAction 
} from '../markdown-utils.js';

// Helper function to capitalize each word
const capitalizeWords = (str: string) => {
  return str.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

// Helper function to collect all referenced block UIDs from text
const collectRefs = (text: string, depth: number = 0, refs: Set<string> = new Set()): Set<string> => {
  if (depth >= 4) return refs; // Max recursion depth
  
  const refRegex = /\(\(([a-zA-Z0-9_-]+)\)\)/g;
  let match;
  
  while ((match = refRegex.exec(text)) !== null) {
    const [_, uid] = match;
    refs.add(uid);
  }
  
  return refs;
};

// Helper function to resolve block references
const resolveRefs = async (graph: Graph, text: string, depth: number = 0): Promise<string> => {
  if (depth >= 4) return text; // Max recursion depth
  
  const refs = collectRefs(text, depth);
  if (refs.size === 0) return text;

  // Get referenced block contents
  const refQuery = `[:find ?uid ?string
                    :in $ [?uid ...]
                    :where [?b :block/uid ?uid]
                          [?b :block/string ?string]]`;
  const refResults = await q(graph, refQuery, [Array.from(refs)]) as [string, string][];
  
  // Create lookup map of uid -> string
  const refMap = new Map<string, string>();
  refResults.forEach(([uid, string]) => {
    refMap.set(uid, string);
  });
  
  // Replace references with their content
  let resolvedText = text;
  for (const uid of refs) {
    const refContent = refMap.get(uid);
    if (refContent) {
      // Recursively resolve nested references
      const resolvedContent = await resolveRefs(graph, refContent, depth + 1);
      resolvedText = resolvedText.replace(
        new RegExp(`\\(\\(${uid}\\)\\)`, 'g'),
        resolvedContent
      );
    }
  }
  
  return resolvedText;
};

export class ToolHandlers {
  private graph: Graph;

  constructor(graph: Graph) {
    this.graph = graph;
  }

  async createOutline(
    outline: Array<{text: string | undefined; level: number}>,
    page_title_uid?: string,
    block_text_uid?: string
  ) {
    // Validate input
    if (!Array.isArray(outline) || outline.length === 0) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'outline must be a non-empty array'
      );
    }

    // Filter out items with undefined text
    const validOutline = outline.filter(item => item.text !== undefined);
    if (validOutline.length === 0) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'outline must contain at least one item with text'
      );
    }

    // Validate outline structure
    const invalidItems = validOutline.filter(item => 
      typeof item.level !== 'number' || 
      item.level < 1 || 
      item.level > 10 ||
      typeof item.text !== 'string' ||
      item.text.trim().length === 0
    );
    
    if (invalidItems.length > 0) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'outline contains invalid items - each item must have a level (1-10) and non-empty text'
      );
    }

    // Helper function to find or create page with retries
    const findOrCreatePage = async (titleOrUid: string, maxRetries = 3, delayMs = 500): Promise<string> => {
      // First try to find by title
      const titleQuery = `[:find ?uid :in $ ?title :where [?e :node/title ?title] [?e :block/uid ?uid]]`;
      const variations = [
        titleOrUid, // Original
        capitalizeWords(titleOrUid), // Each word capitalized
        titleOrUid.toLowerCase() // All lowercase
      ];

      for (let retry = 0; retry < maxRetries; retry++) {
        // Try each case variation
        for (const variation of variations) {
          const findResults = await q(this.graph, titleQuery, [variation]) as [string][];
          if (findResults && findResults.length > 0) {
            return findResults[0][0];
          }
        }

        // If not found as title, try as UID
        const uidQuery = `[:find ?uid
                          :where [?e :block/uid "${titleOrUid}"]
                                 [?e :block/uid ?uid]]`;
        const uidResult = await q(this.graph, uidQuery, []);
        if (uidResult && uidResult.length > 0) {
          return uidResult[0][0];
        }

        // If still not found and this is the first retry, try to create the page
        if (retry === 0) {
          const success = await createPage(this.graph, {
            action: 'create-page',
            page: { title: titleOrUid }
          });

          // Even if createPage returns false, the page might still have been created
          // Wait a bit and continue to next retry
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        }

        if (retry < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }

      throw new McpError(
        ErrorCode.InvalidRequest,
        `Failed to find or create page "${titleOrUid}" after multiple attempts`
      );
    };

    // Get or create the target page
    const targetPageUid = await findOrCreatePage(
      page_title_uid || formatRoamDate(new Date())
    );

    // Helper function to find block with improved relationship checks
    const findBlockWithRetry = async (pageUid: string, blockString: string, maxRetries = 5, initialDelay = 1000): Promise<string> => {
      // Try multiple query strategies
      const queries = [
        // Strategy 1: Direct page and string match
        `[:find ?b-uid ?order
          :where [?p :block/uid "${pageUid}"]
                 [?b :block/page ?p]
                 [?b :block/string "${blockString}"]
                 [?b :block/order ?order]
                 [?b :block/uid ?b-uid]]`,
        
        // Strategy 2: Parent-child relationship
        `[:find ?b-uid ?order
          :where [?p :block/uid "${pageUid}"]
                 [?b :block/parents ?p]
                 [?b :block/string "${blockString}"]
                 [?b :block/order ?order]
                 [?b :block/uid ?b-uid]]`,
        
        // Strategy 3: Broader page relationship
        `[:find ?b-uid ?order
          :where [?p :block/uid "${pageUid}"]
                 [?b :block/page ?page]
                 [?p :block/page ?page]
                 [?b :block/string "${blockString}"]
                 [?b :block/order ?order]
                 [?b :block/uid ?b-uid]]`
      ];

      for (let retry = 0; retry < maxRetries; retry++) {
        // Try each query strategy
        for (const queryStr of queries) {
          const blockResults = await q(this.graph, queryStr, []) as [string, number][];
          if (blockResults && blockResults.length > 0) {
            // Use the most recently created block
            const sorted = blockResults.sort((a, b) => b[1] - a[1]);
            return sorted[0][0];
          }
        }

        // Exponential backoff
        const delay = initialDelay * Math.pow(2, retry);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        console.log(`Retry ${retry + 1}/${maxRetries} finding block "${blockString}" under "${pageUid}"`);
      }

      throw new McpError(
        ErrorCode.InternalError,
        `Failed to find block "${blockString}" under page "${pageUid}" after trying multiple strategies`
      );
    };

    // Helper function to create and verify block with improved error handling
    const createAndVerifyBlock = async (
      content: string,
      parentUid: string,
      maxRetries = 5,
      initialDelay = 1000,
      isRetry = false
    ): Promise<string> => {
      try {
        // Initial delay before any operations
        if (!isRetry) {
          await new Promise(resolve => setTimeout(resolve, initialDelay));
        }

        for (let retry = 0; retry < maxRetries; retry++) {
          console.log(`Attempt ${retry + 1}/${maxRetries} to create block "${content}" under "${parentUid}"`);

          // Create block
          const success = await createBlock(this.graph, {
            action: 'create-block',
            location: {
              'parent-uid': parentUid,
              order: 'last'
            },
            block: { string: content }
          });

          // Wait with exponential backoff
          const delay = initialDelay * Math.pow(2, retry);
          await new Promise(resolve => setTimeout(resolve, delay));

          try {
            // Try to find the block using our improved findBlockWithRetry
            return await findBlockWithRetry(parentUid, content);
          } catch (error: any) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.log(`Failed to find block on attempt ${retry + 1}: ${errorMessage}`);
            if (retry === maxRetries - 1) throw error;
          }
        }

        throw new McpError(
          ErrorCode.InternalError,
          `Failed to create and verify block "${content}" after ${maxRetries} attempts`
        );
      } catch (error) {
        // If this is already a retry, throw the error
        if (isRetry) throw error;

        // Otherwise, try one more time with a clean slate
        console.log(`Retrying block creation for "${content}" with fresh attempt`);
        await new Promise(resolve => setTimeout(resolve, initialDelay * 2));
        return createAndVerifyBlock(content, parentUid, maxRetries, initialDelay, true);
      }
    };

    // Get or create the parent block
    let targetParentUid: string;
    if (!block_text_uid) {
      targetParentUid = targetPageUid;
    } else {
      try {
        // Create header block and get its UID
        targetParentUid = await createAndVerifyBlock(block_text_uid, targetPageUid);
      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to create header block "${block_text_uid}": ${errorMessage}`
        );
      }
    }

    // Initialize result variable
    let result;

    try {
      // Validate level sequence
      let prevLevel = 0;
      for (const item of validOutline) {
        // Level should not increase by more than 1 at a time
        if (item.level > prevLevel + 1) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            `Invalid outline structure - level ${item.level} follows level ${prevLevel}`
          );
        }
        prevLevel = item.level;
      }

      // Convert outline items to markdown-like structure
      const markdownContent = validOutline
        .map(item => {
          const indent = '  '.repeat(item.level - 1);
          return `${indent}- ${item.text?.trim()}`;
        })
        .join('\n');

      // Convert to Roam markdown format
      const convertedContent = convertToRoamMarkdown(markdownContent);

      // Parse markdown into hierarchical structure
      const nodes = parseMarkdown(convertedContent);

      // Convert nodes to batch actions
      const actions = convertToRoamActions(nodes, targetParentUid, 'last');

      if (actions.length === 0) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          'No valid actions generated from outline'
        );
      }

      // Execute batch actions to create the outline
      result = await batchActions(this.graph, {
        action: 'batch-actions',
        actions
      }).catch(error => {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to create outline blocks: ${error.message}`
        );
      });

      if (!result) {
        throw new McpError(
          ErrorCode.InternalError,
          'Failed to create outline blocks - no result returned'
        );
      }
    } catch (error: any) {
      if (error instanceof McpError) throw error;
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to create outline: ${error.message}`
      );
    }

    // Get the created block UIDs
    const createdUids = result?.created_uids || [];
    
    return {
      success: true,
      page_uid: targetPageUid,
      parent_uid: targetParentUid,
      created_uids: createdUids
    };
  }

  async fetchPageByTitle(title: string) {
    if (!title) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'title is required'
      );
    }

    // Try different case variations
    const variations = [
      title, // Original
      capitalizeWords(title), // Each word capitalized
      title.toLowerCase() // All lowercase
    ];

    let uid: string | null = null;
    for (const variation of variations) {
      const searchQuery = `[:find ?uid .
                          :where [?e :node/title "${variation}"]
                                 [?e :block/uid ?uid]]`;
      const result = await q(this.graph, searchQuery, []);
      uid = (result === null || result === undefined) ? null : String(result);
      if (uid) break;
    }

    if (!uid) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Page with title "${title}" not found (tried original, capitalized words, and lowercase)`
      );
    }

    // Get all blocks under this page with their order and parent relationships
    const blocksQuery = `[:find ?block-uid ?block-str ?order ?parent-uid
                        :where [?p :block/uid "${uid}"]
                               [?b :block/page ?p]
                               [?b :block/uid ?block-uid]
                               [?b :block/string ?block-str]
                               [?b :block/order ?order]
                               [?b :block/parents ?parent]
                               [?parent :block/uid ?parent-uid]]`;
    const blocks = await q(this.graph, blocksQuery, []);

    if (blocks.length > 0) {
      const blockMap = new Map<string, RoamBlock>();
      for (const [uid, string, order] of blocks) {
        if (!blockMap.has(uid)) {
          const resolvedString = await resolveRefs(this.graph, string);
          blockMap.set(uid, {
            uid,
            string: resolvedString,
            order: order as number,
            children: []
          });
        }
      }

      // Build parent-child relationships
      blocks.forEach(([childUid, _, __, parentUid]) => {
        const child = blockMap.get(childUid);
        const parent = blockMap.get(parentUid);
        if (child && parent && !parent.children.includes(child)) {
          parent.children.push(child);
        }
      });

      // Get top-level blocks
      const topQuery = `[:find ?block-uid ?block-str ?order
                       :where [?p :block/uid "${uid}"]
                              [?b :block/page ?p]
                              [?b :block/uid ?block-uid]
                              [?b :block/string ?block-str]
                              [?b :block/order ?order]
                              (not-join [?b]
                                [?b :block/parents ?parent]
                                [?parent :block/page ?p])]`;
      const topBlocks = await q(this.graph, topQuery, []);

      // Create root blocks
      const rootBlocks = topBlocks
        .map(([uid, string, order]) => ({
          uid,
          string,
          order: order as number,
          children: blockMap.get(uid)?.children || []
        }))
        .sort((a, b) => a.order - b.order);

      // Convert to markdown
      const toMarkdown = (blocks: RoamBlock[], level: number = 0): string => {
        return blocks.map(block => {
          const indent = '  '.repeat(level);
          let md = `${indent}- ${block.string}\n`;
          if (block.children.length > 0) {
            md += toMarkdown(block.children.sort((a, b) => a.order - b.order), level + 1);
          }
          return md;
        }).join('');
      };

      return `# ${title}\n\n${toMarkdown(rootBlocks)}`;
    }

    return `${title} (no content found)`;
  }

  async createPage(title: string, content?: string) {
    // Ensure title is properly formatted
    const pageTitle = String(title).trim();
    
    // First try to find if the page exists
    const findQuery = `[:find ?uid :in $ ?title :where [?e :node/title ?title] [?e :block/uid ?uid]]`;
    type FindResult = [string];
    const findResults = await q(this.graph, findQuery, [pageTitle]) as FindResult[];
    
    let pageUid: string | undefined;
    
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
      const results = await q(this.graph, findQuery, [pageTitle]) as FindResult[];
      if (!results || results.length === 0) {
        throw new Error('Could not find created page');
      }
      pageUid = results[0][0];
    }
    
    // If content is provided, check if it looks like nested markdown
    if (content) {
      const isMultilined = content.includes('\n') || hasMarkdownTable(content);
      
      if (isMultilined) {
        // Use import_nested_markdown functionality
        const convertedContent = convertToRoamMarkdown(content);
        const nodes = parseMarkdown(convertedContent);
        const actions = convertToRoamActions(nodes, pageUid, 'last');
        const result = await batchActions(this.graph, {
          action: 'batch-actions',
          actions
        });
        
        if (!result) {
          throw new Error('Failed to import nested markdown content');
        }
      } else {
        // Create a simple block for non-nested content
        const blockSuccess = await createBlock(this.graph, {
          action: 'create-block',
          location: { 
            "parent-uid": pageUid,
            "order": "last"
          },
          block: { string: content }
        });

        if (!blockSuccess) {
          throw new Error('Failed to create content block');
        }
      }
    }
    
    return { success: true, uid: pageUid };
  }

  async createBlock(content: string, page_uid?: string, title?: string) {
    // If page_uid provided, use it directly
    let targetPageUid = page_uid;
    
    // If no page_uid but title provided, search for page by title
    if (!targetPageUid && title) {
      const findQuery = `[:find ?uid :in $ ?title :where [?e :node/title ?title] [?e :block/uid ?uid]]`;
      const findResults = await q(this.graph, findQuery, [title]) as [string][];
      
      if (findResults && findResults.length > 0) {
        targetPageUid = findResults[0][0];
      } else {
        // Create page with provided title if it doesn't exist
        const success = await createPage(this.graph, {
          action: 'create-page',
          page: { title }
        });

        if (!success) {
          throw new Error('Failed to create page with provided title');
        }

        // Get the new page's UID
        const results = await q(this.graph, findQuery, [title]) as [string][];
        if (!results || results.length === 0) {
          throw new Error('Could not find created page');
        }
        targetPageUid = results[0][0];
      }
    }
    
    // If neither page_uid nor title provided, use today's date page
    if (!targetPageUid) {
      const today = new Date();
      const dateStr = formatRoamDate(today);
      
      // Try to find today's page
      const findQuery = `[:find ?uid :in $ ?title :where [?e :node/title ?title] [?e :block/uid ?uid]]`;
      const findResults = await q(this.graph, findQuery, [dateStr]) as [string][];
      
      if (findResults && findResults.length > 0) {
        targetPageUid = findResults[0][0];
      } else {
        // Create today's page if it doesn't exist
        const success = await createPage(this.graph, {
          action: 'create-page',
          page: { title: dateStr }
        });

        if (!success) {
          throw new Error('Failed to create today\'s page');
        }

        // Get the new page's UID
        const results = await q(this.graph, findQuery, [dateStr]) as [string][];
        if (!results || results.length === 0) {
          throw new Error('Could not find created today\'s page');
        }
        targetPageUid = results[0][0];
      }
    }

    // If the content has multiple lines or is a table, use nested import
    if (content.includes('\n')) {
      // Parse and import the nested content
      const convertedContent = convertToRoamMarkdown(content);
      const nodes = parseMarkdown(convertedContent);
      const actions = convertToRoamActions(nodes, targetPageUid, 'last');
      
      // Execute batch actions to create the nested structure
      const result = await batchActions(this.graph, {
        action: 'batch-actions',
        actions
      });

      if (!result) {
        throw new Error('Failed to create nested blocks');
      }

      const blockUid = result.created_uids?.[0];
      return { 
        success: true,
        block_uid: blockUid,
        parent_uid: targetPageUid
      };
    } else {
      // For non-table content, create a simple block
      const result = await createBlock(this.graph, {
        action: 'create-block',
        location: { 
          "parent-uid": targetPageUid,
          "order": "last"
        },
        block: { string: content }
      });

      if (!result) {
        throw new Error('Failed to create block');
      }

      // Get the block's UID
      const findBlockQuery = `[:find ?uid
                             :in $ ?parent ?string
                             :where [?b :block/uid ?uid]
                                   [?b :block/string ?string]
                                   [?b :block/parents ?p]
                                   [?p :block/uid ?parent]]`;
      const blockResults = await q(this.graph, findBlockQuery, [targetPageUid, content]) as [string][];
      
      if (!blockResults || blockResults.length === 0) {
        throw new Error('Could not find created block');
      }

      const blockUid = blockResults[0][0];
      return { 
        success: true,
        block_uid: blockUid,
        parent_uid: targetPageUid
      };
    }
  }

  async importMarkdown(
    content: string,
    page_uid?: string,
    page_title?: string,
    parent_uid?: string,
    parent_string?: string,
    order: 'first' | 'last' = 'first'
  ) {
    // First get the page UID
    let targetPageUid = page_uid;
    
    if (!targetPageUid && page_title) {
      const findQuery = `[:find ?uid :in $ ?title :where [?e :node/title ?title] [?e :block/uid ?uid]]`;
      const findResults = await q(this.graph, findQuery, [page_title]) as [string][];
      
      if (findResults && findResults.length > 0) {
        targetPageUid = findResults[0][0];
      } else {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Page with title "${page_title}" not found`
        );
      }
    }

    // If no page specified, use today's date page
    if (!targetPageUid) {
      const today = new Date();
      const dateStr = formatRoamDate(today);
      
      const findQuery = `[:find ?uid :in $ ?title :where [?e :node/title ?title] [?e :block/uid ?uid]]`;
      const findResults = await q(this.graph, findQuery, [dateStr]) as [string][];
      
      if (findResults && findResults.length > 0) {
        targetPageUid = findResults[0][0];
      } else {
        // Create today's page
        const success = await createPage(this.graph, {
          action: 'create-page',
          page: { title: dateStr }
        });

        if (!success) {
          throw new McpError(
            ErrorCode.InternalError,
            'Failed to create today\'s page'
          );
        }

        const results = await q(this.graph, findQuery, [dateStr]) as [string][];
        if (!results || results.length === 0) {
          throw new McpError(
            ErrorCode.InternalError,
            'Could not find created today\'s page'
          );
        }
        targetPageUid = results[0][0];
      }
    }

    // Now get the parent block UID
    let targetParentUid = parent_uid;

    if (!targetParentUid && parent_string) {
      if (!targetPageUid) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          'Must provide either page_uid or page_title when using parent_string'
        );
      }

      // Find block by exact string match within the page
      const findBlockQuery = `[:find ?uid
                             :where [?p :block/uid "${targetPageUid}"]
                                    [?b :block/page ?p]
                                    [?b :block/string "${parent_string}"]]`;
      const blockResults = await q(this.graph, findBlockQuery, []) as [string][];
      
      if (!blockResults || blockResults.length === 0) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Block with content "${parent_string}" not found on specified page`
        );
      }
      
      targetParentUid = blockResults[0][0];
    }

    // If no parent specified, use page as parent
    if (!targetParentUid) {
      targetParentUid = targetPageUid;
    }

    // Always use parseMarkdown for content with multiple lines or any markdown formatting
    const isMultilined = content.includes('\n');
    
    if (isMultilined) {
      // Parse markdown into hierarchical structure
      const convertedContent = convertToRoamMarkdown(content);
      const nodes = parseMarkdown(convertedContent);

      // Convert markdown nodes to batch actions
      const actions = convertToRoamActions(nodes, targetParentUid, order);

      // Execute batch actions to add content
      const result = await batchActions(this.graph, {
        action: 'batch-actions',
        actions
      });

      if (!result) {
        throw new McpError(
          ErrorCode.InternalError,
          'Failed to import nested markdown content'
        );
      }

      // Get the created block UIDs
      const createdUids = result.created_uids || [];
      
      return { 
        success: true,
        page_uid: targetPageUid,
        parent_uid: targetParentUid,
        created_uids: createdUids
      };
    } else {
      // Create a simple block for non-nested content
      const blockSuccess = await createBlock(this.graph, {
        action: 'create-block',
        location: { 
          "parent-uid": targetParentUid,
          order
        },
        block: { string: content }
      });

      if (!blockSuccess) {
        throw new McpError(
          ErrorCode.InternalError,
          'Failed to create content block'
        );
      }

      return { 
        success: true,
        page_uid: targetPageUid,
        parent_uid: targetParentUid
      };
    }
  }

  async addTodos(todos: string[]) {
    if (!Array.isArray(todos) || todos.length === 0) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'todos must be a non-empty array'
      );
    }

    // Get today's date
    const today = new Date();
    const dateStr = formatRoamDate(today);
    
    // Try to find today's page
    const findQuery = `[:find ?uid :in $ ?title :where [?e :node/title ?title] [?e :block/uid ?uid]]`;
    const findResults = await q(this.graph, findQuery, [dateStr]) as [string][];
    
    let targetPageUid: string;
    
    if (findResults && findResults.length > 0) {
      targetPageUid = findResults[0][0];
    } else {
      // Create today's page if it doesn't exist
      const success = await createPage(this.graph, {
        action: 'create-page',
        page: { title: dateStr }
      });

      if (!success) {
        throw new Error('Failed to create today\'s page');
      }

      // Get the new page's UID
      const results = await q(this.graph, findQuery, [dateStr]) as [string][];
      if (!results || results.length === 0) {
        throw new Error('Could not find created today\'s page');
      }
      targetPageUid = results[0][0];
    }

    // If more than 10 todos, use batch actions
    const todo_tag = "{{TODO}}";
    if (todos.length > 10) {
      const actions = todos.map((todo, index) => ({
        action: 'create-block',
        location: {
          'parent-uid': targetPageUid,
          order: index
        },
        block: {
          string: `${todo_tag} ${todo}`
        }
      }));

      const result = await batchActions(this.graph, {
        action: 'batch-actions',
        actions
      });

      if (!result) {
        throw new Error('Failed to create todo blocks');
      }
    } else {
      // Create todos sequentially
      for (const todo of todos) {
        const success = await createBlock(this.graph, {
          action: 'create-block',
          location: { 
            "parent-uid": targetPageUid,
            "order": "last"
          },
          block: { string: `${todo_tag} ${todo}` }
        });
        
        if (!success) {
          throw new Error('Failed to create todo block');
        }
      }
    }
    
    return { success: true };
  }
}
