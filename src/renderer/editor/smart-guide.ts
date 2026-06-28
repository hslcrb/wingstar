// Smart alignment guides for Figma-like snapping
// Detects when dragged element edges align with nearby elements

export interface SnapResult {
  snapX: number | null;
  snapY: number | null;
  guides: GuideLine[];
}

export interface GuideLine {
  axis: 'h' | 'v';
  pos: number;
  start: number;
  end: number;
}

const SNAP_THRESHOLD = 6;

export function calcSnap(
  draggedRect: DOMRect,
  allElements: HTMLElement[],
  containerRect: DOMRect
): SnapResult {
  let snapX: number | null = null;
  let snapY: number | null = null;
  const guides: GuideLine[] = [];

  const dLeft = draggedRect.left;
  const dRight = draggedRect.right;
  const dTop = draggedRect.top;
  const dBottom = draggedRect.bottom;
  const dHCenter = draggedRect.left + draggedRect.width / 2;
  const dVCenter = draggedRect.top + draggedRect.height / 2;

  for (const el of allElements) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;

    const edges = {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      hCenter: rect.left + rect.width / 2,
      vCenter: rect.top + rect.height / 2,
    };

    // Horizontal edges
    const hChecks: { val: number; edge: string }[] = [
      { val: edges.left, edge: 'left' },
      { val: edges.right, edge: 'right' },
      { val: edges.hCenter, edge: 'hCenter' },
    ];

    for (const check of hChecks) {
      // Compare dragged left, right, hCenter
      if (Math.abs(dLeft - check.val) < SNAP_THRESHOLD) {
        snapX = check.val - draggedRect.left;
        guides.push({ axis: 'v', pos: check.val, start: Math.min(dTop, rect.top), end: Math.max(dBottom, rect.bottom) });
      } else if (Math.abs(dRight - check.val) < SNAP_THRESHOLD) {
        snapX = check.val - draggedRect.width - draggedRect.left;
        guides.push({ axis: 'v', pos: check.val, start: Math.min(dTop, rect.top), end: Math.max(dBottom, rect.bottom) });
      } else if (Math.abs(dHCenter - check.val) < SNAP_THRESHOLD) {
        snapX = check.val - draggedRect.width / 2 - draggedRect.left;
        guides.push({ axis: 'v', pos: check.val, start: Math.min(dTop, rect.top), end: Math.max(dBottom, rect.bottom) });
      }
    }

    // Vertical edges
    const vChecks: { val: number; edge: string }[] = [
      { val: edges.top, edge: 'top' },
      { val: edges.bottom, edge: 'bottom' },
      { val: edges.vCenter, edge: 'vCenter' },
    ];

    for (const check of vChecks) {
      if (Math.abs(dTop - check.val) < SNAP_THRESHOLD) {
        snapY = check.val - draggedRect.top;
        guides.push({ axis: 'h', pos: check.val, start: Math.min(dLeft, rect.left), end: Math.max(dRight, rect.right) });
      } else if (Math.abs(dBottom - check.val) < SNAP_THRESHOLD) {
        snapY = check.val - draggedRect.height - draggedRect.top;
        guides.push({ axis: 'h', pos: check.val, start: Math.min(dLeft, rect.left), end: Math.max(dRight, rect.right) });
      } else if (Math.abs(dVCenter - check.val) < SNAP_THRESHOLD) {
        snapY = check.val - draggedRect.height / 2 - draggedRect.top;
        guides.push({ axis: 'h', pos: check.val, start: Math.min(dLeft, rect.left), end: Math.max(dRight, rect.right) });
      }
    }
  }

  return { snapX, snapY, guides };
}

const guideContainerId = 'smart-guide-container';

function getGuideContainer(): HTMLElement {
  let c = document.getElementById(guideContainerId);
  if (!c) {
    c = document.createElement('div');
    c.id = guideContainerId;
    c.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99999;';
    document.body.appendChild(c);
  }
  return c;
}

export function renderGuides(guides: GuideLine[], _overlay: HTMLElement) {
  const c = getGuideContainer();
  c.innerHTML = '';

  for (const guide of guides) {
    const line = document.createElement('div');
    line.className = 'smart-guide';
    if (guide.axis === 'v') {
      line.style.cssText = `
        position: absolute;
        left: ${guide.pos}px;
        top: ${guide.start}px;
        height: ${guide.end - guide.start}px;
        width: 1px;
        background: #4fc3f7;
        box-shadow: 0 0 3px rgba(79, 195, 247, 0.6);
      `;
    } else {
      line.style.cssText = `
        position: absolute;
        top: ${guide.pos}px;
        left: ${guide.start}px;
        width: ${guide.end - guide.start}px;
        height: 1px;
        background: #4fc3f7;
        box-shadow: 0 0 3px rgba(79, 195, 247, 0.6);
      `;
    }
    c.appendChild(line);
  }
}

export function clearGuides(_overlay?: HTMLElement) {
  const c = document.getElementById(guideContainerId);
  if (c) c.innerHTML = '';
}
