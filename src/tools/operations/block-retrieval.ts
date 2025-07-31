import { Graph, q } from '@roam-research/roam-api-sdk';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { RoamBlock } from '../../types/roam.js';

export class BlockRetrievalOperations {
  constructor(private graph: Graph) {}

  async fetchBlockWithChildren(block_uid_raw: string, depth: number = 4): Promise<RoamBlock | null> {
    if (!block_uid_raw) {
      throw new McpError(ErrorCode.InvalidRequest, 'block_uid is required.');
    }

    // Remove any Roam-specific formatting like ((UID))
    const block_uid = block_uid_raw.replace(/^\(\((.*)\)\)$/, '$1');

    // Helper function to recursively fetch children
    const fetchChildren = async (parentUid: string, currentDepth: number): Promise<RoamBlock[]> => {
      if (currentDepth >= depth) {
        return [];
      }

      // Datomic query to find direct children of a block, ordered by their 'order' attribute
      const childrenQuery = `[:find ?childUid ?childString ?childOrder ?childHeading
                              :in $ ?parentUid
                              :where [?parent :block/uid ?parentUid]
                                     [?child :block/parents ?parent]
                                     [?child :block/uid ?childUid]
                                     [?child :block/string ?childString]
                                     [?child :block/order ?childOrder]
                                     [(get-else $ ?child :block/heading nil) ?childHeading]]`;

      const childrenResults = await q(this.graph, childrenQuery, [parentUid]) as [string, string, number, number | null][];

      // Sort children by order
      childrenResults.sort((a, b) => a[2] - b[2]);

      const children: RoamBlock[] = [];
      for (const [childUid, childString, childOrder, childHeading] of childrenResults) {
        const nestedChildren = await fetchChildren(childUid, currentDepth + 1);
        children.push({
          uid: childUid,
          string: childString,
          order: childOrder,
          heading: childHeading || undefined,
          children: nestedChildren,
        });
      }
      return children;
    };

    try {
      // Fetch the root block details
      const rootBlockQuery = `[:find ?string ?order ?heading
                               :in $ ?blockUid
                               :where [?b :block/uid ?blockUid]
                                      [?b :block/string ?string]
                                      [?b :block/order ?order]
                                      [(get-else $ ?b :block/heading nil) ?heading]]`;
      const rootBlockResult = await q(this.graph, rootBlockQuery, [block_uid]) as [string, number, number | null] | null;

      if (!rootBlockResult) {
        return null; // Block not found
      }

      const [rootString, rootOrder, rootHeading] = rootBlockResult;
      const children = await fetchChildren(block_uid, 0);

      return {
        uid: block_uid,
        string: rootString,
        order: rootOrder,
        heading: rootHeading || undefined,
        children: children,
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to fetch block with children: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
