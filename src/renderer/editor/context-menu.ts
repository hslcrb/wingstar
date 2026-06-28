export interface ContextMenuActions {
  copy: () => void;
  paste: () => void;
  delete: () => void;
  group: () => void;
  ungroup: () => void;
  align: (mode: string) => void;
}

export class ContextMenu {
  private menu: HTMLElement | null = null;
  private actions: ContextMenuActions;
  private activeEl: HTMLElement | null = null;

  constructor(actions: ContextMenuActions) {
    this.actions = actions;
  }

  show(x: number, y: number, targetEl: HTMLElement | null) {
    this.hide();
    this.activeEl = targetEl;

    this.menu = document.createElement('div');
    this.menu.className = 'context-menu';
    this.menu.style.cssText = `
      position: fixed; left: ${x}px; top: ${y}px;
      z-index: 100000;
    `;

    const items: { label: string; shortcut?: string; action: () => void; divider?: boolean }[] = [
      { label: '복사', shortcut: 'Ctrl+C', action: () => this.actions.copy() },
      { label: '붙여넣기', shortcut: 'Ctrl+V', action: () => this.actions.paste() },
      { divider: true, label: '', action: () => {} },
      { label: '그룹', shortcut: 'Ctrl+G', action: () => this.actions.group() },
      { label: '그룹 해제', shortcut: 'Ctrl+Shift+G', action: () => this.actions.ungroup() },
      { divider: true, label: '', action: () => {} },
      { label: '삭제', shortcut: 'Delete', action: () => this.actions.delete() },
      { divider: true, label: '', action: () => {} },
      { label: '왼쪽 정렬', action: () => this.actions.align('left') },
      { label: '가운데 정렬', action: () => this.actions.align('center') },
      { label: '오른쪽 정렬', action: () => this.actions.align('right') },
      { divider: true, label: '', action: () => {} },
      { label: '위쪽 정렬', action: () => this.actions.align('top') },
      { label: '중앙 정렬', action: () => this.actions.align('middle') },
      { label: '아래쪽 정렬', action: () => this.actions.align('bottom') },
    ];

    for (const item of items) {
      if (item.divider) {
        const sep = document.createElement('div');
        sep.className = 'context-menu-separator';
        this.menu.appendChild(sep);
        continue;
      }
      const el = document.createElement('div');
      el.className = 'context-menu-item';
      el.innerHTML = `<span>${item.label}</span>${item.shortcut ? `<span class="cm-shortcut">${item.shortcut}</span>` : ''}`;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        item.action();
        this.hide();
      });
      this.menu.appendChild(el);
    }

    document.body.appendChild(this.menu);

    // Adjust if offscreen
    const rect = this.menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      this.menu.style.left = `${window.innerWidth - rect.width - 8}px`;
    }
    if (rect.bottom > window.innerHeight) {
      this.menu.style.top = `${window.innerHeight - rect.height - 8}px`;
    }

    // Close on click outside
    setTimeout(() => document.addEventListener('click', this.outsideClick), 0);
  }

  private outsideClick = () => {
    this.hide();
  };

  hide() {
    if (this.menu) {
      this.menu.remove();
      this.menu = null;
    }
    document.removeEventListener('click', this.outsideClick);
    this.activeEl = null;
  }
}
