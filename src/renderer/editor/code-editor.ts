export class CodeEditorManager {
  private editor: any = null;
  private container: HTMLElement;
  private onCodeChangedCallback: ((code: string) => void) | null = null;
  private isUpdatingSilently = false;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId) as HTMLElement;
  }

  /**
   * Initializes the Monaco editor using the globally loaded AMD loader.
   */
  public init(initialCode: string, onReady: () => void) {
    // @ts-ignore
    const amdRequire = window.require;
    
    if (!amdRequire) {
      console.error('Monaco loader was not found in the window context.');
      return;
    }

    amdRequire.config({
      paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' }
    });

    amdRequire(['vs/editor/editor.main'], () => {
      // @ts-ignore
      this.editor = window.monaco.editor.create(this.container, {
        value: initialCode,
        language: 'html',
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 13,
        fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
        lineHeight: 20,
        roundedSelection: true,
        scrollbar: {
          verticalScrollbarSize: 8,
          horizontalScrollbarSize: 8,
          useShadows: false
        },
        padding: { top: 8 }
      });

      // Handle raw code input changes
      this.editor.onDidChangeModelContent(() => {
        if (this.isUpdatingSilently) return;
        
        if (this.onCodeChangedCallback) {
          this.onCodeChangedCallback(this.editor.getValue());
        }
      });

      onReady();
    });
  }

  /**
   * Register callback for editor text modifications.
   */
  public onCodeChanged(callback: (code: string) => void) {
    this.onCodeChangedCallback = callback;
  }

  public setCode(code: string) {
    if (!this.editor) {
      console.warn('[CodeEditor] setCode called before editor initialized');
      return;
    }
    requestAnimationFrame(() => {
      if (!this.editor) return;
      try {
        this.isUpdatingSilently = true;
        this.editor.setValue(code);
      } catch (err) {
        console.error('[CodeEditor] setValue failed:', err);
      } finally {
        this.isUpdatingSilently = false;
      }
    });
  }

  /**
   * Retrieves the current code contents of the editor.
   */
  public getCode(): string {
    if (!this.editor) return '';
    return this.editor.getValue();
  }

  /**
   * Triggers Monaco's native document formatter.
   */
  public formatCode() {
    if (!this.editor) return;
    
    // Run Monaco's format document command
    this.editor.getAction('editor.action.formatDocument').run();
  }
}
