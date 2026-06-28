export interface UndoCallbacks {
  onRestore: (html: string) => void;
}

export class UndoManager {
  private stack: string[] = [];
  private index = -1;
  private maxSize: number;
  private callbacks: UndoCallbacks;
  private ignoreNext = false;

  constructor(callbacks: UndoCallbacks, maxSize = 50) {
    this.callbacks = callbacks;
    this.maxSize = maxSize;
  }

  pushState(html: string) {
    if (this.ignoreNext) {
      this.ignoreNext = false;
      return;
    }
    if (this.index >= 0 && this.stack[this.index] === html) return;
    if (this.index < this.stack.length - 1) {
      this.stack = this.stack.slice(0, this.index + 1);
    }
    this.stack.push(html);
    if (this.stack.length > this.maxSize) {
      this.stack.shift();
    }
    this.index = this.stack.length - 1;
  }

  undo(): boolean {
    if (this.index <= 0) return false;
    this.index--;
    this.ignoreNext = true;
    this.callbacks.onRestore(this.stack[this.index]);
    return true;
  }

  redo(): boolean {
    if (this.index >= this.stack.length - 1) return false;
    this.index++;
    this.ignoreNext = true;
    this.callbacks.onRestore(this.stack[this.index]);
    return true;
  }

  canUndo(): boolean {
    return this.index > 0;
  }

  canRedo(): boolean {
    return this.index < this.stack.length - 1;
  }

  reset(html: string) {
    this.stack = [html];
    this.index = 0;
    this.ignoreNext = false;
  }

  getCurrentIndex(): number {
    return this.index;
  }

  getSize(): number {
    return this.stack.length;
  }
}