const GUIDE_CONTAINER_ID = 'wingstar-guide-container';

interface Guide {
  axis: 'horizontal' | 'vertical';
  pos: number;
}

let guides: Guide[] = [];

export function initRulerGuides(canvasWrapper: HTMLElement) {
  const hRuler = document.getElementById('ruler-horizontal');
  const vRuler = document.getElementById('ruler-vertical');

  if (hRuler) {
    hRuler.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      const rect = canvasWrapper.getBoundingClientRect();
      startGuideDrag(e.clientY - rect.top, 'horizontal', canvasWrapper);
    });
  }

  if (vRuler) {
    vRuler.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      const rect = canvasWrapper.getBoundingClientRect();
      startGuideDrag(e.clientX - rect.left, 'vertical', canvasWrapper);
    });
  }
}

function startGuideDrag(startPos: number, axis: 'horizontal' | 'vertical', wrapper: HTMLElement) {
  const container = getGuideContainer();
  const guideEl = document.createElement('div');
  guideEl.className = `ruler-guide ${axis}`;
  guideEl.style.opacity = '0.5';
  if (axis === 'horizontal') {
    guideEl.style.top = `${startPos}px`;
  } else {
    guideEl.style.left = `${startPos}px`;
  }
  container.appendChild(guideEl);

  const onMove = (e: MouseEvent) => {
    const rect = wrapper.getBoundingClientRect();
    if (axis === 'horizontal') {
      guideEl.style.top = `${e.clientY - rect.top}px`;
    } else {
      guideEl.style.left = `${e.clientX - rect.left}px`;
    }
    guideEl.style.opacity = '1';
  };

  const onUp = (e: MouseEvent) => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);

    const rect = wrapper.getBoundingClientRect();
    const pos = axis === 'horizontal'
      ? e.clientY - rect.top
      : e.clientX - rect.left;

    if (pos < 0 || pos > (axis === 'horizontal' ? rect.height : rect.width)) {
      guideEl.remove();
      return;
    }

    guideEl.style.opacity = '1';
    if (axis === 'horizontal') {
      guideEl.style.top = `${pos}px`;
    } else {
      guideEl.style.left = `${pos}px`;
    }

    const g: Guide = { axis, pos };
    guides.push(g);

    guideEl.addEventListener('dblclick', () => {
      guideEl.remove();
      guides = guides.filter(gg => gg !== g);
    });
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

function getGuideContainer(): HTMLElement {
  let container = document.getElementById(GUIDE_CONTAINER_ID);
  if (!container) {
    const wrapper = document.getElementById('canvas-wrapper');
    if (!wrapper) throw new Error('canvas-wrapper not found');
    container = document.createElement('div');
    container.id = GUIDE_CONTAINER_ID;
    container.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none;z-index:25;overflow:hidden;';
    wrapper.appendChild(container);

    // Re-create existing guides
    guides.forEach(g => {
      const el = document.createElement('div');
      el.className = `ruler-guide ${g.axis}`;
      if (g.axis === 'horizontal') el.style.top = `${g.pos}px`;
      else el.style.left = `${g.pos}px`;
      container!.appendChild(el);
      el.addEventListener('dblclick', () => {
        el.remove();
        guides = guides.filter(gg => gg !== g);
      });
    });
  }
  return container;
}

export function renderSavedGuides() {
  const wrapper = document.getElementById('canvas-wrapper');
  if (!wrapper) return;
  const existing = document.getElementById(GUIDE_CONTAINER_ID);
  if (existing) existing.remove();
  // Will be recreated on next getGuideContainer call
}

export function clearAllGuides() {
  guides = [];
  const container = document.getElementById(GUIDE_CONTAINER_ID);
  if (container) container.remove();
}
