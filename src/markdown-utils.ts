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
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    const node = parseLine(line);
    
    // Find the appropriate parent for this node based on level
    while (stack.length > 0 && stack[stack.length - 1].level >= node.level) {
      stack.pop();
    }
    
    if (stack.length === 0) {
      root.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }
    
    stack.push(node);
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
  // Handle list items
  else if (content.match(/^[*+-]\s/)) {
    level = line.match(/^\s*/)?.[0].length ?? 0;
    content = content.replace(/^[*+-]\s+/, '');
  }
  // Handle numbered lists
  else if (content.match(/^\d+\.\s/)) {
    level = line.match(/^\s*/)?.[0].length ?? 0;
    content = content.replace(/^\d+\.\s+/, '');
  }
  // Handle indented lines
  else {
    level = line.match(/^\s*/)?.[0].length ?? 0;
    content = content.trim();
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
