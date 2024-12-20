import type { 
  RoamCreateBlock,
  RoamCreatePage,
  RoamUpdateBlock,
  RoamDeleteBlock,
  RoamDeletePage,
  RoamMoveBlock
} from '@roam-research/roam-api-sdk';

export type BatchAction = 
  | RoamCreateBlock 
  | RoamCreatePage 
  | RoamUpdateBlock 
  | RoamDeleteBlock 
  | RoamDeletePage 
  | RoamMoveBlock;

interface MarkdownNode {
  content: string;
  level: number;
  children: MarkdownNode[];
}

export function parseMarkdown(markdown: string): MarkdownNode[] {
  const lines = markdown.split('\n');
  const root: MarkdownNode[] = [];
  const stack: MarkdownNode[] = [];
  let lastNode: MarkdownNode | null = null;
  
  // Process first line separately if it's a heading
  const firstLine = lines[0]?.trim();
  if (firstLine && firstLine.startsWith('#')) {
    const headingNode = parseLine(firstLine);
    root.push(headingNode);
    lastNode = headingNode;
    lines.shift(); // Remove first line from processing
  }
  
  // Process remaining lines
  for (const line of lines) {
    if (!line.trim()) continue;
    
    const node = parseLine(line);
    
    if (lastNode === null) {
      root.push(node);
      lastNode = node;
      continue;
    }
    
    // If this is a child of the last node
    if (node.level > lastNode.level) {
      lastNode.children.push(node);
    }
    // If this is a sibling or belongs to a parent
    else {
      // Find the appropriate parent
      let parent: MarkdownNode | undefined = lastNode;
      while (parent && parent.level >= node.level) {
        const idx = stack.lastIndexOf(parent);
        if (idx > 0) {
          parent = stack[idx - 1];
        } else {
          parent = undefined;
        }
      }
      
      if (parent) {
        parent.children.push(node);
      } else if (root.length === 1 && root[0].content) {
        // If we have a heading as root, nest under it
        root[0].children.push(node);
      } else {
        root.push(node);
      }
    }
    
    stack.push(node);
    lastNode = node;
  }
  
  return root;
}

function parseLine(line: string): MarkdownNode {
  let level = 0;
  let content = line.trim();
  
  // Handle headings
  if (content.startsWith('#')) {
    const match = content.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      level = match[1].length;
      content = match[2];
    }
  }
  // Calculate indentation level (2 spaces = 1 level)
  const indentation = line.match(/^\s*/)?.[0].length ?? 0;
  level = Math.floor(indentation / 2);

  // Handle list items
  if (content.match(/^[*+-]\s/)) {
    content = content.replace(/^[*+-]\s+/, '');
  }
  // Handle numbered lists
  else if (content.match(/^\d+\.\s/)) {
    content = content.replace(/^\d+\.\s+/, '');
  }
  
  return {
    content,
    level,
    children: []
  };
}

function generateBlockUid(): string {
  // Generate a random string of 9 characters (Roam's format)
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_';
  let uid = '';
  for (let i = 0; i < 9; i++) {
    uid += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return uid;
}

interface BlockInfo {
  uid: string;
  content: string;
  children: BlockInfo[];
}

function convertNodesToBlocks(nodes: MarkdownNode[]): BlockInfo[] {
  return nodes.map(node => ({
    uid: generateBlockUid(),
    content: node.content,
    children: convertNodesToBlocks(node.children)
  }));
}

export function convertToRoamActions(
  nodes: MarkdownNode[], 
  parentUid: string,
  order: 'first' | 'last' | number = 'last'
): BatchAction[] {
  // First convert nodes to blocks with UIDs
  const blocks = convertNodesToBlocks(nodes);
  const actions: BatchAction[] = [];

  // Helper function to recursively create actions
  function createBlockActions(blocks: BlockInfo[], parentUid: string, order: 'first' | 'last' | number): void {
    for (const block of blocks) {
      // Create the current block
      const action: RoamCreateBlock = {
        action: 'create-block',
        location: {
          'parent-uid': parentUid,
          order
        },
        block: {
          uid: block.uid,
          string: block.content
        }
      };
      
      actions.push(action);

      // Create child blocks if any
      if (block.children.length > 0) {
        createBlockActions(block.children, block.uid, 'last');
      }
    }
  }

  // Create all block actions
  createBlockActions(blocks, parentUid, order);
  
  return actions;
}
