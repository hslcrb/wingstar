export class CodeEditorManager {
  private textarea: HTMLTextAreaElement | null = null;
  private lineNumbers: HTMLElement | null = null;
  private container: HTMLElement;
  private onCodeChangedCallback: ((code: string) => void) | null = null;
  private isUpdatingSilently = false;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId) as HTMLElement;
  }

  public init(initialCode: string, onReady: () => void) {
    if (!this.container) {
      console.warn('[CodeEditor] container not found');
      onReady();
      return;
    }

    this.container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'code-editor-wrapper';

    this.lineNumbers = document.createElement('div');
    this.lineNumbers.className = 'code-editor-lines';

    this.textarea = document.createElement('textarea');
    this.textarea.className = 'code-editor-textarea';
    this.textarea.value = initialCode;
    this.textarea.spellcheck = false;
    this.textarea.setAttribute('wrap', 'off');

    wrapper.appendChild(this.lineNumbers);
    wrapper.appendChild(this.textarea);
    this.container.appendChild(wrapper);

    this.updateLineNumbers();

    this.textarea.addEventListener('input', () => {
      this.updateLineNumbers();
      if (this.isUpdatingSilently) return;
      if (this.onCodeChangedCallback) {
        this.onCodeChangedCallback(this.getValue());
      }
    });

    this.textarea.addEventListener('scroll', () => {
      if (this.lineNumbers) {
        this.lineNumbers.scrollTop = this.textarea!.scrollTop;
      }
    });

    this.textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.textarea!.selectionStart;
        const end = this.textarea!.selectionEnd;
        const val = this.textarea!.value;
        if (!e.shiftKey) {
          this.setValue(val.substring(0, start) + '  ' + val.substring(end));
          this.textarea!.selectionStart = this.textarea!.selectionEnd = start + 2;
        } else {
          const lineStart = val.lastIndexOf('\n', start - 1) + 1;
          if (val.substring(lineStart, lineStart + 2) === '  ') {
            this.setValue(val.substring(0, lineStart) + val.substring(lineStart + 2));
            this.textarea!.selectionStart = this.textarea!.selectionEnd = Math.max(start - 2, lineStart);
          }
        }
        this.updateLineNumbers();
        this.notifyChange();
      }
    });

    onReady();
  }

  public onCodeChanged(callback: (code: string) => void) {
    this.onCodeChangedCallback = callback;
  }

  public setCode(code: string) {
    if (!this.textarea) return;
    requestAnimationFrame(() => {
      this.isUpdatingSilently = true;
      this.textarea!.value = code;
      this.updateLineNumbers();
      this.isUpdatingSilently = false;
    });
  }

  public getCode(): string {
    return this.textarea ? this.textarea.value : '';
  }

  public formatCode() {
    if (!this.textarea) return;
    const code = this.textarea.value;
    const formatted = this.basicFormat(code);
    this.isUpdatingSilently = true;
    this.textarea.value = formatted;
    this.updateLineNumbers();
    this.isUpdatingSilently = false;
    this.notifyChange();
  }

  private getValue(): string {
    return this.textarea ? this.textarea.value : '';
  }

  private setValue(val: string) {
    if (this.textarea) this.textarea.value = val;
  }

  private updateLineNumbers() {
    if (!this.lineNumbers || !this.textarea) return;
    const lines = this.textarea.value.split('\n').length;
    this.lineNumbers.innerHTML = Array.from({ length: lines }, (_, i) =>
      `<span>${i + 1}</span>`
    ).join('');
  }

  private notifyChange() {
    if (this.onCodeChangedCallback) {
      this.onCodeChangedCallback(this.getValue());
    }
  }

  private basicFormat(code: string): string {
    let out = '';
    let indent = 0;
    const lines = code.split('\n');
    for (let line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('</') || trimmed.startsWith('}') || trimmed.startsWith(']') || trimmed.startsWith(')')) {
        indent = Math.max(0, indent - 1);
      }
      out += '  '.repeat(indent) + trimmed + '\n';
      if (trimmed.endsWith('>') && !trimmed.startsWith('</') && !trimmed.startsWith('<input') && !trimmed.startsWith('<br') && !trimmed.startsWith('<img') && !trimmed.startsWith('<hr') && !trimmed.startsWith('<!--') && !trimmed.endsWith('/>')) {
        indent++;
      }
      if (trimmed.endsWith('{') || trimmed.endsWith('[')) {
        indent++;
      }
    }
    return out.trim();
  }
}
