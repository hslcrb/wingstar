interface LayerItem {
  id: string;
  tagName: string;
  label: string;
  visible: boolean;
  locked: boolean;
  depth: number;
  element: HTMLElement;
}

type MultiSelectCallback = (els: HTMLElement[]) => void;

export class LayerPanel {
  private container: HTMLElement;
  private statusBadge: HTMLElement;
  private items: LayerItem[] = [];
  private selectedId: string | null = null;
  private dragId: string | null = null;
  private onSelect: (el: HTMLElement | null) => void;
  private onMultiSelect: MultiSelectCallback;
  private onReorder: () => void;

  constructor(
    containerId: string,
    badgeId: string,
    callbacks: {
      onSelect: (el: HTMLElement | null) => void;
      onMultiSelect: MultiSelectCallback;
      onReorder: () => void;
    }
  ) {
    this.container = document.getElementById(containerId) as HTMLElement;
    this.statusBadge = document.getElementById(badgeId) as HTMLElement;
    this.onSelect = callbacks.onSelect;
    this.onMultiSelect = callbacks.onMultiSelect;
    this.onReorder = callbacks.onReorder;
  }

  refresh(doc: Document | null, selectedEl: HTMLElement | null) {
    this.selectedId = selectedEl ? this.getElementId(selectedEl) : null;
    this.items = [];
    if (!doc || !doc.body) {
      this.renderEmpty();
      return;
    }
    this.walkNode(doc.body, 0);
    this.render();
  }

  private getElementId(el: HTMLElement): string {
    return el.id || el.getAttribute('data-wingstar-layer-id') || '';
  }

  private ensureLayerId(el: HTMLElement): string {
    let id = this.getElementId(el);
    if (!id) {
      id = `layer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      el.setAttribute('data-wingstar-layer-id', id);
    }
    return id;
  }

  private walkNode(node: HTMLElement, depth: number) {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = node.tagName.toLowerCase();
    if (tag === 'html' || tag === 'head' || tag === 'style' || tag === 'script' ||
        tag === 'meta' || tag === 'link' || tag === 'title') return;
    if (node.id === 'wingstar-drawing-svg' || node.id === 'wingstar-freeform-layer') return;

    const id = this.ensureLayerId(node);
    const label = this.buildLabel(node);
    const visible = node.style.display !== 'none';
    const locked = node.getAttribute('data-locked') === 'true';
    const item: LayerItem = {
      id, tagName: tag, label, visible, locked, depth, element: node,
    };
    this.items.push(item);

    for (let i = 0; i < node.children.length; i++) {
      this.walkNode(node.children[i] as HTMLElement, depth + 1);
    }
  }

  private buildLabel(el: HTMLElement): string {
    let label = el.tagName.toLowerCase();
    if (el.id && !el.id.startsWith('layer-')) {
      label += `#${el.id}`;
    } else if (el.className && typeof el.className === 'string') {
      const cls = el.className.trim().split(/\s+/)[0];
      if (cls && cls !== 'editable-element' && !cls.startsWith('wingstar')) {
        label += `.${cls}`;
      }
    }
    const text = el.textContent?.trim().slice(0, 20);
    if (text && !el.querySelector('img, svg, video')) {
      label += ` "${text}"`;
    }
    return label;
  }

  private renderEmpty() {
    this.container.innerHTML = '<div class="tree-placeholder">레이어가 없습니다. 캔버스에 요소를 추가하세요.</div>';
    if (this.statusBadge) this.statusBadge.textContent = '비어 있음';
  }

  private render() {
    if (this.items.length === 0) {
      this.renderEmpty();
      return;
    }

    this.container.innerHTML = '';
    if (this.statusBadge) this.statusBadge.textContent = `${this.items.length}개`;

    this.items.forEach((item, idx) => {
      const el = document.createElement('div');
      el.className = 'layer-tree-item';
      if (item.id === this.selectedId) el.classList.add('selected');
      el.style.paddingLeft = `${item.depth * 14 + 8}px`;
      el.setAttribute('data-layer-id', item.id);

      const eyeIcon = item.visible
        ? `<svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`
        : `<svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"></path><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

      const lockIcon = item.locked
        ? `<svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`
        : `<svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>`;

      el.innerHTML = `
        <div class="layer-info">
          <button class="layer-vis-toggle" data-action="toggle-vis">${eyeIcon}</button>
          <span class="layer-icon">${item.tagName}</span>
          <span class="layer-name">${item.label}</span>
        </div>
        <div class="layer-actions">
          <button class="layer-lock-toggle" data-action="toggle-lock">${lockIcon}</button>
          <span class="layer-index">${idx}</span>
        </div>
      `;

      el.draggable = true;
      el.addEventListener('dragstart', (e) => {
        this.dragId = item.id;
        el.classList.add('dragging');
        e.dataTransfer?.setData('text/plain', item.id);
        e.dataTransfer!.effectAllowed = 'move';
      });
      el.addEventListener('dragend', () => {
        el.classList.remove('dragging');
        this.dragId = null;
        this.container.querySelectorAll('.drop-target').forEach(c => c.classList.remove('drop-target'));
      });
      el.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer!.dropEffect = 'move';
        this.container.querySelectorAll('.drop-target').forEach(c => c.classList.remove('drop-target'));
        el.classList.add('drop-target');
      });
      el.addEventListener('dragleave', () => {
        el.classList.remove('drop-target');
      });
      el.addEventListener('drop', (e) => {
        e.preventDefault();
        el.classList.remove('drop-target');
        const fromId = e.dataTransfer?.getData('text/plain');
        if (!fromId || fromId === item.id) return;
        const fromItem = this.items.find(i => i.id === fromId);
        const toItem = this.items.find(i => i.id === item.id);
        if (!fromItem || !toItem) return;
        const parent = toItem.element.parentNode;
        if (!parent) return;
        const siblings = Array.from(parent.children) as HTMLElement[];
        const toIdx = siblings.indexOf(toItem.element);
        parent.insertBefore(fromItem.element, siblings[toIdx + 1] || null);
        this.onReorder();
        this.refresh(fromItem.element.ownerDocument as Document, fromItem.element);
      });

      el.addEventListener('click', (e) => {
        const action = (e.target as HTMLElement).closest('[data-action]');
        if (action) return;
        if (e.shiftKey) {
          el.classList.toggle('selected');
          const selected = this.container.querySelectorAll('.layer-tree-item.selected');
          const els: HTMLElement[] = [];
          selected.forEach(s => {
            const id = s.getAttribute('data-layer-id');
            const found = this.items.find(i => i.id === id);
            if (found) els.push(found.element);
          });
          if (els.length > 0) this.onMultiSelect(els);
          return;
        }
        this.container.querySelectorAll('.layer-tree-item').forEach(c => c.classList.remove('selected'));
        el.classList.add('selected');
        this.onSelect(item.element);
      });

      const visBtn = el.querySelector('[data-action="toggle-vis"]') as HTMLElement;
      if (visBtn) {
        visBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          item.visible = !item.visible;
          item.element.style.display = item.visible ? '' : 'none';
          this.refresh(item.element.ownerDocument as Document, item.element);
          this.onReorder();
        });
      }

      const lockBtn = el.querySelector('[data-action="toggle-lock"]') as HTMLElement;
      if (lockBtn) {
        lockBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          item.locked = !item.locked;
          item.element.setAttribute('data-locked', String(item.locked));
          if (item.locked) {
            item.element.style.pointerEvents = 'none';
            item.element.style.opacity = '0.6';
          } else {
            item.element.style.pointerEvents = '';
            item.element.style.opacity = '';
          }
          this.refresh(item.element.ownerDocument as Document, item.element);
        });
      }

      this.container.appendChild(el);
    });
  }
}