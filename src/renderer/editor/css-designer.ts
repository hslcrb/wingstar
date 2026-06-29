export class CssDesigner {
  private panel: HTMLElement;
  private selectedElement: HTMLElement | null = null;
  private onChanged: (() => void) | null = null;

  constructor(containerId: string) {
    this.panel = document.getElementById(containerId) as HTMLElement;
    if (!this.panel) {
      console.warn(`[CssDesigner] Element #${containerId} not found`);
      return;
    }
    this.setup();
  }

  bind(el: HTMLElement | null) {
    this.selectedElement = el;
    if (!this.panel) return;
    if (!el) { this.panel.classList.add('hidden'); return; }
    this.panel.classList.remove('hidden');
    this.refresh();
  }

  onStyleChanged(cb: () => void) { this.onChanged = cb; }

  private setup() {
    if (!this.panel) return;
    this.panel.addEventListener('input', (e) => {
      if (!this.selectedElement) return;
      const target = e.target as HTMLElement;
      const prop = target.getAttribute('data-css-prop');
      if (!prop) return;
      const val = (target as HTMLInputElement).value;
      this.selectedElement.style.setProperty(prop, val || '');
      if (this.onChanged) this.onChanged();
    });
    this.panel.addEventListener('change', (e) => {
      if (!this.selectedElement) return;
      const target = e.target as HTMLElement;
      const prop = target.getAttribute('data-css-prop');
      if (!prop) return;
      if (target.tagName === 'SELECT') {
        const val = (target as HTMLSelectElement).value;
        this.selectedElement.style.setProperty(prop, val === '__remove__' ? '' : val);
        if (this.onChanged) this.onChanged();
      }
    });
  }

  private refresh() {
    if (!this.selectedElement) return;
    const computed = window.getComputedStyle(this.selectedElement);
    const inputs = this.panel.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-css-prop]');
    inputs.forEach(inp => {
      const prop = inp.getAttribute('data-css-prop')!;
      const inlineVal = (this.selectedElement as HTMLElement).style.getPropertyValue(prop);
      const val = inlineVal || computed.getPropertyValue(prop);
      if (inp.tagName === 'SELECT') {
        const sel = inp as HTMLSelectElement;
        const opt = Array.from(sel.options).find(o => o.value === val || (val === '' && o.value === '__remove__'));
        if (opt) sel.value = opt.value;
      } else {
        if (inp.type === 'color') {
          const hex = this.rgbToHex(val);
          inp.value = hex || '#000000';
        } else {
          inp.value = val;
        }
      }
    });
  }

  private rgbToHex(color: string): string | null {
    if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') return null;
    if (color.startsWith('#')) return color;
    const m = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (m) {
      const r = parseInt(m[1]).toString(16).padStart(2, '0');
      const g = parseInt(m[2]).toString(16).padStart(2, '0');
      const b = parseInt(m[3]).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }
    return null;
  }
}
