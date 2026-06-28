export function compileVectorToHTML(svgMarkup: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgMarkup, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) return svgMarkup;

  function getStyle(el: Element, attr: string, defaultValue = ''): string {
    const direct = el.getAttribute(attr);
    if (direct) return direct;
    const styleAttr = el.getAttribute('style');
    if (styleAttr) {
      const match = styleAttr.match(new RegExp(`(?:^|;)\\s*${attr}\\s*:\\s*([^;]+)`));
      if (match) return match[1].trim();
    }
    return defaultValue;
  }

  function colorToHex(color: string): string {
    if (!color || color === 'none' || color === 'transparent') return 'transparent';
    if (color.startsWith('#')) return color;
    const match = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      const r = parseInt(match[1]).toString(16).padStart(2, '0');
      const g = parseInt(match[2]).toString(16).padStart(2, '0');
      const b = parseInt(match[3]).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }
    return color;
  }

  function processNode(node: Element): string {
    const tagName = node.tagName.toLowerCase();
    const id = node.getAttribute('id') || node.getAttribute('data-name') || '';
    const idAttr = id ? ` id="${id}"` : '';

    if (tagName === 'g') {
      const childrenHtml = Array.from(node.children).map(child => processNode(child)).join('\n');
      const hasText = node.querySelector('text') !== null;
      const hasShape = node.querySelector('rect, circle, ellipse') !== null;

      if (hasText && hasShape) {
        return `
<button${idAttr} class="btn" style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 16px; border-radius: 6px; border: 1px solid var(--border-color, #232335); background-color: var(--bg-input, #1a1a26); color: var(--text-main, #f1f1f7); cursor: pointer; transition: all 0.2s ease;">
  ${childrenHtml}
</button>`.trim();
      }
      return `<div${idAttr} class="vector-group" style="display: flex; flex-direction: column; gap: 8px; position: relative;">\n${childrenHtml}\n</div>`;
    }

    if (tagName === 'text') {
      const fontSize = getStyle(node, 'font-size', '14px');
      const fontFamily = getStyle(node, 'font-family', 'inherit');
      const fill = colorToHex(getStyle(node, 'fill', '#ffffff'));
      const textContent = node.textContent || 'Text';
      return `<span${idAttr} style="font-size: ${fontSize}; font-family: ${fontFamily}; color: ${fill}; font-weight: 500; display: inline-block;">${textContent}</span>`;
    }

    if (tagName === 'rect') {
      const width = node.getAttribute('width') || '80';
      const height = node.getAttribute('height') || '40';
      const fill = colorToHex(getStyle(node, 'fill', '#ffffff'));
      const stroke = colorToHex(getStyle(node, 'stroke', 'none'));
      const strokeWidth = getStyle(node, 'stroke-width', '0');
      const rx = node.getAttribute('rx') || '0';
      const borderStyle = stroke !== 'transparent' ? `border: ${strokeWidth}px solid ${stroke};` : '';
      const borderRadiusStyle = rx !== '0' ? `border-radius: ${rx}px;` : '';
      return `<div${idAttr} style="width: ${width}px; height: ${height}px; background-color: ${fill}; ${borderStyle} ${borderRadiusStyle} display: inline-block; position: relative; min-width: 10px; min-height: 10px;"></div>`;
    }

    if (tagName === 'circle' || tagName === 'ellipse') {
      const rx = tagName === 'circle' ? parseFloat(node.getAttribute('r') || '25') : parseFloat(node.getAttribute('rx') || '25');
      const ry = tagName === 'circle' ? rx : parseFloat(node.getAttribute('ry') || '25');
      const fill = colorToHex(getStyle(node, 'fill', '#ffffff'));
      const stroke = colorToHex(getStyle(node, 'stroke', 'none'));
      const strokeWidth = getStyle(node, 'stroke-width', '0');
      const borderStyle = stroke !== 'transparent' ? `border: ${strokeWidth}px solid ${stroke};` : '';
      return `<div${idAttr} style="width: ${rx * 2}px; height: ${ry * 2}px; background-color: ${fill}; ${borderStyle} border-radius: 50%; display: inline-block; position: relative;"></div>`;
    }

    if (['path', 'polygon', 'polyline', 'line'].includes(tagName)) {
      const fill = colorToHex(getStyle(node, 'fill', 'currentColor'));
      const stroke = colorToHex(getStyle(node, 'stroke', 'none'));
      const strokeWidth = getStyle(node, 'stroke-width', '0');
      let viewBox = '0 0 100 100';
      let parent = node.parentElement;
      while (parent) {
        if (parent.tagName.toLowerCase() === 'svg') {
          viewBox = parent.getAttribute('viewBox') || '0 0 100 100';
          break;
        }
        parent = parent.parentElement;
      }
      const clone = node.cloneNode(true) as Element;
      clone.removeAttribute('fill');
      clone.removeAttribute('stroke');
      clone.removeAttribute('stroke-width');
      return `
<svg${idAttr} viewBox="${viewBox}" width="32" height="32" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" style="display: inline-block; vertical-align: middle;">
  ${clone.outerHTML}
</svg>`.trim();
    }
    return '';
  }

  const childrenHtml = Array.from(svg.children).map(child => processNode(child)).join('\n');
  const rootId = svg.getAttribute('id') || `vector-layout-${Date.now()}`;
  return `
<div id="${rootId}" class="compiled-vector-layout" style="display: flex; flex-wrap: wrap; gap: 16px; align-items: center; justify-content: center; padding: 24px; border: 1px solid var(--border-color, #232335); background-color: var(--bg-panel, #12121c); border-radius: 8px;">
  ${childrenHtml}
</div>`.trim();
}