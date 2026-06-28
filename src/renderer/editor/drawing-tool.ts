export type DrawMode = 'select' | 'rect' | 'ellipse' | 'line';

export interface DrawToolCallbacks {
  onElementCreated: (el: HTMLElement) => void;
  onCanvasChanged: () => void;
}

export class DrawingToolManager {
  private mode: DrawMode = 'select';
  private isDrawing = false;
  private startX = 0;
  private startY = 0;
  private svgContainer: SVGSVGElement | null = null;
  private previewEl: Element | null = null;
  private callbacks: DrawToolCallbacks;
  private iframeDoc: Document | null = null;

  private boundMouseDown: ((e: MouseEvent) => void) | null = null;
  private boundMouseMove: ((e: MouseEvent) => void) | null = null;
  private boundMouseUp: ((e: MouseEvent) => void) | null = null;

  constructor(callbacks: DrawToolCallbacks) {
    this.callbacks = callbacks;
  }

  setMode(mode: DrawMode) {
    this.mode = mode;
    this.removeListeners();
    if (mode !== 'select') {
      this.attachListeners();
    }
  }

  getMode(): DrawMode {
    return this.mode;
  }

  setIframeDoc(doc: Document | null) {
    this.iframeDoc = doc;
    if (!doc) {
      this.svgContainer = null;
    } else {
      this.ensureSvgContainer(doc);
    }
  }

  private ensureSvgContainer(doc: Document) {
    let svg = doc.getElementById('wingstar-drawing-svg') as SVGSVGElement;
    if (!svg) {
      svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.id = 'wingstar-drawing-svg';
      svg.setAttribute('style', `
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        pointer-events: none; z-index: 9999;
      `);
      if (doc.body) {
        doc.body.appendChild(svg);
      }
    }
    this.svgContainer = svg;
  }

  private getIframePoint(e: MouseEvent): { x: number; y: number } | null {
    const iframe = document.getElementById('editor-frame') as HTMLIFrameElement;
    if (!iframe) return null;
    const rect = iframe.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private attachListeners() {
    const iframe = document.getElementById('editor-frame') as HTMLIFrameElement;
    if (!iframe) return;

    this.boundMouseDown = (e: MouseEvent) => {
      if (this.mode === 'select') return;
      const pt = this.getIframePoint(e);
      if (!pt) return;
      this.isDrawing = true;
      this.startX = pt.x;
      this.startY = pt.y;
      this.createPreviewEl(pt.x, pt.y);
    };

    this.boundMouseMove = (e: MouseEvent) => {
      if (!this.isDrawing || this.mode === 'select') return;
      const pt = this.getIframePoint(e);
      if (!pt) return;
      this.updatePreviewEl(pt.x, pt.y);
    };

    this.boundMouseUp = (e: MouseEvent) => {
      if (!this.isDrawing || this.mode === 'select') return;
      this.isDrawing = false;
      this.finalizeShape();
    };

    iframe.addEventListener('mousedown', this.boundMouseDown);
    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('mouseup', this.boundMouseUp);
  }

  private removeListeners() {
    const iframe = document.getElementById('editor-frame') as HTMLIFrameElement;
    if (iframe && this.boundMouseDown) {
      iframe.removeEventListener('mousedown', this.boundMouseDown);
    }
    if (this.boundMouseMove) {
      document.removeEventListener('mousemove', this.boundMouseMove);
    }
    if (this.boundMouseUp) {
      document.removeEventListener('mouseup', this.boundMouseUp);
    }
    this.boundMouseDown = null;
    this.boundMouseMove = null;
    this.boundMouseUp = null;
    if (this.previewEl && this.svgContainer) {
      this.svgContainer.removeChild(this.previewEl);
      this.previewEl = null;
    }
    this.isDrawing = false;
  }

  private createPreviewEl(x: number, y: number) {
    if (!this.svgContainer) return;
    const ns = 'http://www.w3.org/2000/svg';
    let el: Element;
    switch (this.mode) {
      case 'rect':
        el = document.createElementNS(ns, 'rect');
        el.setAttribute('x', String(x));
        el.setAttribute('y', String(y));
        el.setAttribute('width', '0');
        el.setAttribute('height', '0');
        el.setAttribute('fill', 'rgba(139, 92, 246, 0.15)');
        el.setAttribute('stroke', '#8b5cf6');
        el.setAttribute('stroke-width', '2');
        el.setAttribute('stroke-dasharray', '4,2');
        break;
      case 'ellipse':
        el = document.createElementNS(ns, 'ellipse');
        el.setAttribute('cx', String(x));
        el.setAttribute('cy', String(y));
        el.setAttribute('rx', '0');
        el.setAttribute('ry', '0');
        el.setAttribute('fill', 'rgba(139, 92, 246, 0.15)');
        el.setAttribute('stroke', '#8b5cf6');
        el.setAttribute('stroke-width', '2');
        el.setAttribute('stroke-dasharray', '4,2');
        break;
      case 'line':
        el = document.createElementNS(ns, 'line');
        el.setAttribute('x1', String(x));
        el.setAttribute('y1', String(y));
        el.setAttribute('x2', String(x));
        el.setAttribute('y2', String(y));
        el.setAttribute('stroke', '#8b5cf6');
        el.setAttribute('stroke-width', '3');
        el.setAttribute('stroke-linecap', 'round');
        break;
      default:
        return;
    }
    this.svgContainer.appendChild(el);
    this.previewEl = el;
  }

  private updatePreviewEl(x: number, y: number) {
    if (!this.previewEl) return;
    switch (this.mode) {
      case 'rect': {
        const rx = Math.min(this.startX, x);
        const ry = Math.min(this.startY, y);
        const rw = Math.abs(x - this.startX);
        const rh = Math.abs(y - this.startY);
        this.previewEl.setAttribute('x', String(rx));
        this.previewEl.setAttribute('y', String(ry));
        this.previewEl.setAttribute('width', String(rw));
        this.previewEl.setAttribute('height', String(rh));
        break;
      }
      case 'ellipse': {
        const cx = (this.startX + x) / 2;
        const cy = (this.startY + y) / 2;
        const rx = Math.abs(x - this.startX) / 2;
        const ry = Math.abs(y - this.startY) / 2;
        this.previewEl.setAttribute('cx', String(cx));
        this.previewEl.setAttribute('cy', String(cy));
        this.previewEl.setAttribute('rx', String(rx));
        this.previewEl.setAttribute('ry', String(ry));
        break;
      }
      case 'line': {
        this.previewEl.setAttribute('x2', String(x));
        this.previewEl.setAttribute('y2', String(y));
        break;
      }
    }
  }

  private finalizeShape() {
    if (!this.previewEl || !this.svgContainer) return;

    const finalEl = this.previewEl.cloneNode(true) as Element;
    this.svgContainer.removeChild(this.previewEl);
    this.previewEl = null;

    const id = `shape-${Date.now()}`;
    finalEl.setAttribute('id', id);
    finalEl.setAttribute('data-wingstar-shape', 'true');
    finalEl.setAttribute('data-wingstar-mode', this.mode);
    finalEl.setAttribute('style', 'pointer-events: auto; cursor: move;');
    finalEl.removeAttribute('stroke-dasharray');

    let fill = finalEl.getAttribute('fill') || 'rgba(139, 92, 246, 0.15)';
    if (this.mode === 'line') {
      fill = 'none';
    }
    fill = fill.replace('rgba(139, 92, 246, 0.15)', '#c084fc');
    finalEl.setAttribute('fill', fill);

    this.svgContainer.appendChild(finalEl);

    const el = finalEl as unknown as HTMLElement;
    this.callbacks.onElementCreated(el);
    this.callbacks.onCanvasChanged();
  }

  destroy() {
    this.removeListeners();
    this.svgContainer = null;
    this.iframeDoc = null;
  }
}