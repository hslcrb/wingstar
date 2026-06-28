export class ClassManager {
  private container: HTMLElement;
  private input: HTMLInputElement;
  private listEl: HTMLElement;
  private currentEl: HTMLElement | null = null;
  private onChangeCallback: (() => void) | null = null;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId) as HTMLElement;
    this.listEl = this.container.querySelector('.class-list') as HTMLElement;
    this.input = this.container.querySelector('.class-input') as HTMLInputElement;

    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.addClass();
    });

    this.listEl.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('.class-remove-btn') as HTMLElement;
      if (btn) {
        const className = btn.getAttribute('data-class');
        if (className) this.removeClass(className);
      }
    });
  }

  public bind(el: HTMLElement | null) {
    this.currentEl = el;
    if (!el) {
      this.container.classList.add('hidden');
      return;
    }
    this.container.classList.remove('hidden');
    this.render();
  }

  public onChange(callback: () => void) {
    this.onChangeCallback = callback;
  }

  private render() {
    if (!this.currentEl) return;
    const classes = this.currentEl.className
      .split(/\s+/)
      .filter(c => c && c !== 'editable-element' && c !== 'wingstar-group');

    this.listEl.innerHTML = classes.map(c =>
      `<span class="class-badge">${c}<button class="class-remove-btn" data-class="${c}">&times;</button></span>`
    ).join('');
    this.input.value = '';
  }

  private addClass() {
    if (!this.currentEl) return;
    const val = this.input.value.trim();
    if (!val) return;
    const existing = this.currentEl.className.split(/\s+/);
    val.split(/\s+/).forEach(name => {
      if (name && !existing.includes(name)) {
        existing.push(name);
      }
    });
    this.currentEl.className = existing.filter(c => c).join(' ');
    this.render();
    if (this.onChangeCallback) this.onChangeCallback();
  }

  private removeClass(name: string) {
    if (!this.currentEl) return;
    const existing = this.currentEl.className.split(/\s+/).filter(c => c !== name);
    this.currentEl.className = existing.join(' ');
    this.render();
    if (this.onChangeCallback) this.onChangeCallback();
  }
}
