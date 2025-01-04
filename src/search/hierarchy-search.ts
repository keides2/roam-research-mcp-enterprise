import { q } from '@roam-research/roam-api-sdk';
import type { Graph } from '@roam-research/roam-api-sdk';
import { BaseSearchHandler, SearchResult } from './types.js';
import { SearchUtils } from './utils.js';

export interface HierarchySearchParams {
  parent_uid?: string;  // Search for children of this block
  child_uid?: string;   // Search for parents of this block
  page_title_uid?: string;
  max_depth?: number;   // How many levels deep to search (default: 1)
}

export class HierarchySearchHandler extends BaseSearchHandler {
  constructor(
    graph: Graph,
    private params: HierarchySearchParams
  ) {
    super(graph);
  }

  async execute(): Promise<SearchResult> {
    const { parent_uid, child_uid, page_title_uid, max_depth = 1 } = this.params;

    if (!parent_uid && !child_uid) {
      return {
        success: false,
        matches: [],
        message: 'Either parent_uid or child_uid must be provided'
      };
    }

    // Get target page UID if provided
    let targetPageUid: string | undefined;
    if (page_title_uid) {
      targetPageUid = await SearchUtils.findPageByTitleOrUid(this.graph, page_title_uid);
    }

    let queryStr: string;
    let queryParams: any[];

    if (parent_uid) {
      // Search for children of a specific block
      if (targetPageUid) {
        queryStr = `[:find ?block-uid ?block-str ?depth
                    :in $ ?parent-uid ?page-uid ?max-depth
                    :where [?p :block/uid ?page-uid]
                           [?parent :block/uid ?parent-uid]
                           [?b :block/parents ?parent]
                           [?b :block/string ?block-str]
                           [?b :block/uid ?block-uid]
                           [?b :block/page ?p]
                           [(get-else $ ?b :block/path-length 1) ?depth]
                           [(<= ?depth ?max-depth)]]`;
        queryParams = [parent_uid, targetPageUid, max_depth];
      } else {
        queryStr = `[:find ?block-uid ?block-str ?page-title ?depth
                    :in $ ?parent-uid ?max-depth
                    :where [?parent :block/uid ?parent-uid]
                           [?b :block/parents ?parent]
                           [?b :block/string ?block-str]
                           [?b :block/uid ?block-uid]
                           [?b :block/page ?p]
                           [?p :node/title ?page-title]
                           [(get-else $ ?b :block/path-length 1) ?depth]
                           [(<= ?depth ?max-depth)]]`;
        queryParams = [parent_uid, max_depth];
      }
    } else {
      // Search for parents of a specific block
      if (targetPageUid) {
        queryStr = `[:find ?block-uid ?block-str ?depth
                    :in $ ?child-uid ?page-uid ?max-depth
                    :where [?p :block/uid ?page-uid]
                           [?child :block/uid ?child-uid]
                           [?child :block/parents ?b]
                           [?b :block/string ?block-str]
                           [?b :block/uid ?block-uid]
                           [?b :block/page ?p]
                           [(get-else $ ?b :block/path-length 1) ?depth]
                           [(<= ?depth ?max-depth)]]`;
        queryParams = [child_uid, targetPageUid, max_depth];
      } else {
        queryStr = `[:find ?block-uid ?block-str ?page-title ?depth
                    :in $ ?child-uid ?max-depth
                    :where [?child :block/uid ?child-uid]
                           [?child :block/parents ?b]
                           [?b :block/string ?block-str]
                           [?b :block/uid ?block-uid]
                           [?b :block/page ?p]
                           [?p :node/title ?page-title]
                           [(get-else $ ?b :block/path-length 1) ?depth]
                           [(<= ?depth ?max-depth)]]`;
        queryParams = [child_uid, max_depth];
      }
    }

    const results = await q(this.graph, queryStr, queryParams) as [string, string, string?, number?][];
    
    // Format results to include depth information
    const matches = results.map(([uid, content, pageTitle, depth]) => ({
      block_uid: uid,
      content,
      depth: depth || 1,
      ...(pageTitle && { page_title: pageTitle })
    }));

    const searchDescription = parent_uid
      ? `children of block ${parent_uid} (max depth: ${max_depth})`
      : `parents of block ${child_uid} (max depth: ${max_depth})`;

    return {
      success: true,
      matches,
      message: `Found ${matches.length} block(s) as ${searchDescription}`
    };
  }
}
