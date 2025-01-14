import { q } from '@roam-research/roam-api-sdk';
import type { Graph } from '@roam-research/roam-api-sdk';
import { BaseSearchHandler, SearchResult } from './types.js';
import { SearchUtils } from './utils.js';

export interface TextSearchParams {
  text: string;
  page_title_uid?: string;
}

export class TextSearchHandler extends BaseSearchHandler {
  constructor(
    graph: Graph,
    private params: TextSearchParams
  ) {
    super(graph);
  }

  async execute(): Promise<SearchResult> {
    const { text, page_title_uid } = this.params;

    // Get target page UID if provided for scoped search
    let targetPageUid: string | undefined;
    if (page_title_uid) {
      targetPageUid = await SearchUtils.findPageByTitleOrUid(this.graph, page_title_uid);
    }

    // Build query to find blocks containing the text
    const queryStr = `[:find ?block-uid ?block-str ?page-title
                      :in $ ?search-text
                      :where 
                      [?b :block/string ?block-str]
                      [(clojure.string/includes? ?block-str ?search-text)]
                      [?b :block/uid ?block-uid]
                      [?b :block/page ?p]
                      [?p :node/title ?page-title]]`;
    const queryParams = [text];

    const results = await q(this.graph, queryStr, queryParams) as [string, string, string?][];
    
    const searchDescription = `containing "${text}"`;
    return SearchUtils.formatSearchResults(results, searchDescription, !targetPageUid);
  }
}
