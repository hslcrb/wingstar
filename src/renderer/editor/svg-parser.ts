export interface VectorNode {
  id: string; // Internal unique node key
  name: string; // Friendly display label (ID, class, or tag name)
  type: string; // Tag name (e.g., "g", "path", "rect")
  svgId?: string; // Original ID attribute if present
  children?: VectorNode[];
  attributes: { [key: string]: string };
  outerHTML: string;
}

let nodeIdCounter = 0;

/**
 * Parses raw SVG markup into a hierarchical VectorNode tree.
 */
export function parseSVG(svgText: string): VectorNode | null {
  nodeIdCounter = 0;
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const rootSvg = doc.querySelector('svg');
  
  if (!rootSvg) {
    return null;
  }
  
  return walkNode(rootSvg);
}

/**
 * Recursively walks the DOM tree to construct the VectorNode hierarchy.
 */
function walkNode(el: Element): VectorNode {
  const type = el.tagName.toLowerCase();
  const svgId = el.getAttribute('id') || undefined;
  const dataName = el.getAttribute('data-name') || undefined;
  const className = el.getAttribute('class') || undefined;
  
  // Choose the best display name for the layer item
  let name = el.tagName;
  if (svgId) {
    name = `#${svgId}`;
  } else if (dataName) {
    name = dataName;
  } else if (className) {
    name = `.${className.trim().split(/\s+/)[0]}`;
  }

  // Extract all attributes for property inspection
  const attributes: { [key: string]: string } = {};
  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes[i];
    attributes[attr.name] = attr.value;
  }

  // Walk children elements
  const children: VectorNode[] = [];
  for (let i = 0; i < el.children.length; i++) {
    const child = el.children[i];
    const tagName = child.tagName.toLowerCase();
    
    // Ignore non-graphical metadata elements
    if (['style', 'title', 'desc', 'metadata', 'defs'].includes(tagName)) {
      continue;
    }
    
    children.push(walkNode(child));
  }

  const node: VectorNode = {
    id: `vnode-${nodeIdCounter++}`,
    name,
    type,
    svgId,
    attributes,
    outerHTML: el.outerHTML
  };

  if (children.length > 0) {
    node.children = children;
  }

  return node;
}
