import { q } from '@roam-research/roam-api-sdk';
import type { Graph } from '@roam-research/roam-api-sdk';
import { BaseSearchHandler, TagSearchParams, SearchResult } from './types.js';
import { SearchUtils } from './utils.js';

export class TagSearchHandler extends BaseSearchHandler {
  constructor(
    graph: Graph,
    private params: TagSearchParams
  ) {
    super(graph);
  }

  async execute(): Promise<SearchResult> {
    const { primary_tag, page_title_uid, near_tag, exclude_tag } = this.params;

    // Format tags to handle both # and [[]] formats
    const primaryTagFormats = SearchUtils.formatTag(primary_tag);
    const nearTagFormats = near_tag ? SearchUtils.formatTag(near_tag) : undefined;
    const excludeTagFormats = exclude_tag ? SearchUtils.formatTag(exclude_tag) : undefined;

    // Get target page UID if provided
    let targetPageUid: string | undefined;
    if (page_title_uid) {
      targetPageUid = await SearchUtils.findPageByTitleOrUid(this.graph, page_title_uid);
    }

    // Build query based on whether we're searching in a specific page and/or for a nearby tag
    let queryStr: string;
    let queryParams: any[];

    if (targetPageUid) {
      if (nearTagFormats) {
        queryStr = `[:find ?block-uid ?block-str
                    :in $ [?primary-tag1 ?primary-tag2] [?near-tag1 ?near-tag2] [?exclude-tag1 ?exclude-tag2] ?page-uid
                    :where [?p :block/uid ?page-uid]
                           [?b :block/page ?p]
                           [?b :block/string ?block-str]
                           [?b :block/uid ?block-uid]
                           (or [(clojure.string/includes? ?block-str ?primary-tag1)]
                               [(clojure.string/includes? ?block-str ?primary-tag2)])
                           (or [(clojure.string/includes? ?block-str ?near-tag1)]
                               [(clojure.string/includes? ?block-str ?near-tag2)])
                           (not (or [(clojure.string/includes? ?block-str ?exclude-tag1)]
                                  [(clojure.string/includes? ?block-str ?exclude-tag2)]))]`;
        queryParams = [primaryTagFormats, nearTagFormats, excludeTagFormats || ['', ''], targetPageUid];
      } else {
        queryStr = `[:find ?block-uid ?block-str
                    :in $ [?primary-tag1 ?primary-tag2] [?exclude-tag1 ?exclude-tag2] ?page-uid
                    :where [?p :block/uid ?page-uid]
                           [?b :block/page ?p]
                           [?b :block/string ?block-str]
                           [?b :block/uid ?block-uid]
                           (or [(clojure.string/includes? ?block-str ?primary-tag1)]
                               [(clojure.string/includes? ?block-str ?primary-tag2)])
                           (not (or [(clojure.string/includes? ?block-str ?exclude-tag1)]
                                  [(clojure.string/includes? ?block-str ?exclude-tag2)]))]`;
        queryParams = [primaryTagFormats, excludeTagFormats || ['', ''], targetPageUid];
      }
    } else {
      // Search across all pages
      if (nearTagFormats) {
        queryStr = `[:find ?block-uid ?block-str ?page-title
                    :in $ [?primary-tag1 ?primary-tag2] [?near-tag1 ?near-tag2] [?exclude-tag1 ?exclude-tag2]
                    :where [?b :block/string ?block-str]
                           [?b :block/uid ?block-uid]
                           [?b :block/page ?p]
                           [?p :node/title ?page-title]
                           (or [(clojure.string/includes? ?block-str ?primary-tag1)]
                               [(clojure.string/includes? ?block-str ?primary-tag2)])
                           (or [(clojure.string/includes? ?block-str ?near-tag1)]
                               [(clojure.string/includes? ?block-str ?near-tag2)])
                           (not (or [(clojure.string/includes? ?block-str ?exclude-tag1)]
                                  [(clojure.string/includes? ?block-str ?exclude-tag2)]))]`;
        queryParams = [primaryTagFormats, nearTagFormats, excludeTagFormats || ['', '']];
      } else {
        queryStr = `[:find ?block-uid ?block-str ?page-title
                    :in $ [?primary-tag1 ?primary-tag2] [?exclude-tag1 ?exclude-tag2]
                    :where [?b :block/string ?block-str]
                           [?b :block/uid ?block-uid]
                           [?b :block/page ?p]
                           [?p :node/title ?page-title]
                           (or [(clojure.string/includes? ?block-str ?primary-tag1)]
                               [(clojure.string/includes? ?block-str ?primary-tag2)])
                           (not (or [(clojure.string/includes? ?block-str ?exclude-tag1)]
                                  [(clojure.string/includes? ?block-str ?exclude-tag2)]))]`;
        queryParams = [primaryTagFormats, excludeTagFormats || ['', '']];
      }
    }

    const results = await q(this.graph, queryStr, queryParams) as [string, string, string?][];
    
    const searchDescription = `containing ${primaryTagFormats.join(' or ')}${
      nearTagFormats ? ` near ${nearTagFormats.join(' or ')}` : ''
    }${excludeTagFormats ? ` excluding ${excludeTagFormats.join(' or ')}` : ''}`;
    return SearchUtils.formatSearchResults(results, searchDescription, !targetPageUid);
  }
}
