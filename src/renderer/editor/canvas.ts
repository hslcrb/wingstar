import { componentTemplates } from './templates';

export class CanvasManager {
  private iframe: HTMLIFrameElement;
  private overlay: HTMLElement;
  private label: HTMLElement;
  private deleteBtn: HTMLElement;
  private selectedElement: HTMLElement | null = null;
  private isLiveMode = false;
  
  private onElementSelectedCallback: ((el: HTMLElement | null) => void) | null = null;
  private onCanvasChangedCallback: ((html: string) => void) | null = null;

  // Bound event handlers stored for removal in live mode
  private boundClickHandler: ((e: MouseEvent) => void) | null = null;
  private boundDblClickHandler: ((e: MouseEvent) => void) | null = null;
  private boundDragOverHandler: ((e: DragEvent) => void) | null = null;
  private boundDragLeaveHandler: ((e: DragEvent) => void) | null = null;
  private boundDropHandler: ((e: DragEvent) => void) | null = null;

  // Resize state
  private isResizing = false;
  private resizeDirection = '';
  private startWidth = 0;
  private startHeight = 0;
  private startX = 0;
  private startY = 0;

  constructor(iframeId: string, overlayId: string) {
    this.iframe = document.getElementById(iframeId) as HTMLIFrameElement;
    this.overlay = document.getElementById(overlayId) as HTMLElement;
    this.label = document.getElementById('selection-label') as HTMLElement;
    this.deleteBtn = document.getElementById('btn-delete-element') as HTMLElement;

    this.setupResizeListeners();
    this.setupDeleteListener();
    this.setupDragAndDrop();
    this.setupLabelDragListener();

    // Listen to outer window resize once to prevent memory leaks
    window.addEventListener('resize', () => {
      this.updateOverlayPosition();
    });
  }

  public setContent(html: string) {
    this.selectElement(null);

    const doc = this.iframe.contentDocument || this.iframe.contentWindow?.document;
    if (!doc) {
      console.warn('[Canvas] iframe document not available, skipping setContent');
      return;
    }

    try {
      this.iframe.onload = () => {
        this.bindIframeEvents();
      };
      doc.open();
      doc.write(html);
      doc.close();
    } catch (err) {
      console.error('[Canvas] setContent failed:', err);
    }
  }

  public getContent(): string {
    const doc = this.iframe.contentDocument || this.iframe.contentWindow?.document;
    if (!doc || !doc.documentElement) {
      console.warn('[Canvas] document not available for getContent');
      return '';
    }
    
    try {
      const tempDoc = doc.documentElement.cloneNode(true) as HTMLElement;
      const editableElements = tempDoc.querySelectorAll('[contenteditable]');
      editableElements.forEach(el => {
        el.removeAttribute('contenteditable');
      });
      return '<!DOCTYPE html>\n' + tempDoc.outerHTML;
    } catch (err) {
      console.error('[Canvas] getContent failed:', err);
      return '';
    }
  }

  public onElementSelected(callback: (el: HTMLElement | null) => void) {
    this.onElementSelectedCallback = callback;
  }

  public onCanvasChanged(callback: (html: string) => void) {
    this.onCanvasChangedCallback = callback;
  }

  /**
   * Switches between Live mode (native browser interactions) and Design mode (editing).
   */
  public setLiveMode(enabled: boolean) {
    this.isLiveMode = enabled;
    const doc = this.iframe.contentDocument || this.iframe.contentWindow?.document;

    if (enabled) {
      // Hide selection overlay
      this.selectElement(null);
      // Let iframe receive mouse events natively
      this.iframe.style.pointerEvents = 'auto';
      this.iframe.style.cursor = 'default';
      // Remove design-mode event listeners from iframe doc
      if (doc) {
        if (this.boundClickHandler) doc.removeEventListener('click', this.boundClickHandler as any);
        if (this.boundDblClickHandler) doc.removeEventListener('dblclick', this.boundDblClickHandler as any);
        if (this.boundDragOverHandler) doc.removeEventListener('dragover', this.boundDragOverHandler as any);
        if (this.boundDragLeaveHandler) doc.removeEventListener('dragleave', this.boundDragLeaveHandler as any);
        if (this.boundDropHandler) doc.removeEventListener('drop', this.boundDropHandler as any);
      }
    } else {
      // Restore design mode
      this.iframe.style.pointerEvents = '';
      this.iframe.style.cursor = '';
      // Re-bind iframe events
      this.bindIframeEvents();
    }
  }

  public getLiveMode(): boolean {
    return this.isLiveMode;
  }

  public selectElement(el: HTMLElement | null) {
    this.selectedElement = el;
    
    if (!el || el.tagName.toLowerCase() === 'body' || el.tagName.toLowerCase() === 'html') {
      this.selectedElement = null;
      this.overlay.classList.add('hidden');
      if (this.onElementSelectedCallback) {
        this.onElementSelectedCallback(null);
      }
      return;
    }

    this.updateOverlayPosition();
    this.overlay.classList.remove('hidden');

    // Update label text (Tag name + ID/Class if available)
    let labelText = el.tagName.toLowerCase();
    if (el.id) {
      labelText += `#${el.id}`;
    } else if (el.className) {
      const firstClass = el.className.split(/\s+/)[0];
      if (firstClass && firstClass !== 'editable-element') {
        labelText += `.${firstClass}`;
      }
    }
    this.label.textContent = labelText;

    if (this.onElementSelectedCallback) {
      this.onElementSelectedCallback(el);
    }
  }

  public updateOverlayPosition() {
    if (!this.selectedElement) {
      this.overlay.classList.add('hidden');
      return;
    }

    const rect = this.selectedElement.getBoundingClientRect();
    
    // Position overlay relative to the iframe's screen bounds (which is aligned with .canvas-wrapper)
    this.overlay.style.top = `${rect.top}px`;
    this.overlay.style.left = `${rect.left}px`;
    this.overlay.style.width = `${rect.width}px`;
    this.overlay.style.height = `${rect.height}px`;
  }

  private bindIframeEvents() {
    const doc = this.iframe.contentDocument || this.iframe.contentWindow?.document;
    if (!doc) return;

    // Skip if we're in live mode
    if (this.isLiveMode) return;

    // Remove any previously-registered handlers first to avoid duplicates
    if (this.boundClickHandler) doc.removeEventListener('click', this.boundClickHandler as any);
    if (this.boundDblClickHandler) doc.removeEventListener('dblclick', this.boundDblClickHandler as any);
    if (this.boundDragOverHandler) doc.removeEventListener('dragover', this.boundDragOverHandler as any);
    if (this.boundDragLeaveHandler) doc.removeEventListener('dragleave', this.boundDragLeaveHandler as any);
    if (this.boundDropHandler) doc.removeEventListener('drop', this.boundDropHandler as any);

    // Handle clicks for selection
    this.boundClickHandler = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const target = e.target as HTMLElement;
      this.selectElement(target);
    };
    doc.addEventListener('click', this.boundClickHandler as any);

    // Handle double-click for inline text editing
    this.boundDblClickHandler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const textTags = ['p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'button', 'a', 'li'];
      if (textTags.includes(target.tagName.toLowerCase()) || (target.childNodes.length === 1 && target.childNodes[0].nodeType === Node.TEXT_NODE)) {
        target.contentEditable = 'true';
        target.focus();
        target.classList.add('editable-element');
        this.overlay.classList.add('hidden');
        const onBlur = () => {
          target.removeAttribute('contenteditable');
          target.classList.remove('editable-element');
          this.selectElement(target);
          this.notifyChanges();
          target.removeEventListener('blur', onBlur);
        };
        target.addEventListener('blur', onBlur);
      }
    };
    doc.addEventListener('dblclick', this.boundDblClickHandler as any);

    // Sync overlay positioning when scrolling inside iframe
    this.iframe.contentWindow?.addEventListener('scroll', () => {
      this.updateOverlayPosition();
    });

    // Drag-over highlight
    this.boundDragOverHandler = (e: DragEvent) => {
      e.preventDefault();
      const target = e.target as HTMLElement;
      if (target && target.tagName.toLowerCase() !== 'html') {
        target.style.outline = '2px dashed var(--primary)';
      }
    };
    doc.addEventListener('dragover', this.boundDragOverHandler as any);

    this.boundDragLeaveHandler = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      if (target) target.style.outline = '';
    };
    doc.addEventListener('dragleave', this.boundDragLeaveHandler as any);

    // Drop handler
    this.boundDropHandler = (e: DragEvent) => {
      e.preventDefault();
      const target = e.target as HTMLElement;
      if (target) target.style.outline = '';

      const componentType = e.dataTransfer?.getData('text/plain');
      if (!componentType || !componentTemplates[componentType]) return;

      const template = componentTemplates[componentType].html;
      const tempDiv = doc.createElement('div');
      tempDiv.innerHTML = template.trim();
      const newElement = tempDiv.firstChild as HTMLElement;

      if (target && target.tagName.toLowerCase() !== 'body' && target.tagName.toLowerCase() !== 'html') {
        const containerTags = ['section', 'div', 'header', 'footer', 'main', 'aside'];
        if (containerTags.includes(target.tagName.toLowerCase())) {
          target.appendChild(newElement);
        } else {
          target.parentNode?.insertBefore(newElement, target.nextSibling);
        }
      } else {
        doc.body.appendChild(newElement);
      }

      this.selectElement(newElement);
      this.notifyChanges();
    };
    doc.addEventListener('drop', this.boundDropHandler as any);
  }

  private setupResizeListeners() {
    const handles = this.overlay.querySelectorAll('.resize-handle');
    
    handles.forEach(handle => {
      const el = handle as HTMLElement;
      el.addEventListener('mousedown', (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!this.selectedElement) return;

        this.isResizing = true;
        this.iframe.style.pointerEvents = 'none';
        
        // Find direction from class (tl, tr, bl, br)
        const classes = el.className.split(/\s+/);
        this.resizeDirection = classes.find(c => ['tl', 'tr', 'bl', 'br'].includes(c)) || '';

        const rect = this.selectedElement.getBoundingClientRect();
        this.startWidth = rect.width;
        this.startHeight = rect.height;
        this.startX = e.clientX;
        this.startY = e.clientY;

        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseup', this.handleMouseUp);
      });
    });
  }

  private handleMouseMove = (e: MouseEvent) => {
    if (!this.isResizing || !this.selectedElement) return;

    const deltaX = e.clientX - this.startX;
    const deltaY = e.clientY - this.startY;
    let newWidth = this.startWidth;
    let newHeight = this.startHeight;

    // Calculate sizing depending on handle direction
    if (this.resizeDirection.includes('r')) {
      newWidth = this.startWidth + deltaX;
    } else if (this.resizeDirection.includes('l')) {
      newWidth = this.startWidth - deltaX;
    }

    if (this.resizeDirection.includes('b')) {
      newHeight = this.startHeight + deltaY;
    } else if (this.resizeDirection.includes('t')) {
      newHeight = this.startHeight - deltaY;
    }

    // Min bounds
    newWidth = Math.max(10, newWidth);
    newHeight = Math.max(10, newHeight);

    // Apply inline style to element
    this.selectedElement.style.width = `${newWidth}px`;
    this.selectedElement.style.height = `${newHeight}px`;

    // Realign overlay
    this.updateOverlayPosition();
  };

  private handleMouseUp = () => {
    if (this.isResizing) {
      this.isResizing = false;
      this.iframe.style.pointerEvents = '';
      document.removeEventListener('mousemove', this.handleMouseMove);
      document.removeEventListener('mouseup', this.handleMouseUp);
      this.notifyChanges();
    }
  };

  private setupDeleteListener() {
    this.deleteBtn.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation();
      if (!this.selectedElement) return;

      const parent = this.selectedElement.parentNode;
      if (parent) {
        this.selectedElement.remove();
        this.selectElement(null);
        this.notifyChanges();
      }
    });
  }

  private setupDragAndDrop() {
    const workspaceRoot = document.querySelector('.workspace-root') as HTMLElement;
    const canvasWrapper = document.getElementById('canvas-wrapper') as HTMLElement;

    // Listen to dragovers from the sidebar palette onto the workspace root
    workspaceRoot.addEventListener('dragover', (e: DragEvent) => {
      e.preventDefault();
      canvasWrapper.classList.add('drag-over');
    });

    workspaceRoot.addEventListener('dragleave', () => {
      canvasWrapper.classList.remove('drag-over');
    });

    workspaceRoot.addEventListener('drop', (e: DragEvent) => {
      canvasWrapper.classList.remove('drag-over');
    });
  }

  private setupLabelDragListener() {
    this.label.style.cursor = 'grab';

    this.label.addEventListener('mousedown', (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!this.selectedElement) return;

      this.label.style.cursor = 'grabbing';
      const selected = this.selectedElement;

      // Save original styles and disable pointer-events to perform hit testing
      const originalPointerEvents = selected.style.pointerEvents;
      selected.style.pointerEvents = 'none';

      let lastHoveredEl: HTMLElement | null = null;
      let lastPlacement: 'before' | 'after' | 'append' = 'append';

      const iframeDoc = this.iframe.contentDocument || this.iframe.contentWindow?.document;
      if (!iframeDoc) return;

      // Create a visual indicator element inside iframe for drop placement
      let dropIndicator = iframeDoc.getElementById('wingstar-drop-indicator') as HTMLElement;
      if (!dropIndicator) {
        dropIndicator = iframeDoc.createElement('div');
        dropIndicator.id = 'wingstar-drop-indicator';
        dropIndicator.style.cssText = `
          height: 4px;
          background-color: #8b5cf6;
          box-shadow: 0 0 8px rgba(139, 92, 246, 0.8);
          position: relative;
          transition: all 0.1s ease;
          pointer-events: none;
          margin: 4px 0;
          z-index: 9999;
        `;
      }

      const onMouseMove = (moveEvent: MouseEvent) => {
        const iframeRect = this.iframe.getBoundingClientRect();
        
        let clientX = moveEvent.clientX;
        let clientY = moveEvent.clientY;

        // If mouse is inside parent window context, translate by iframe bounds
        if (moveEvent.currentTarget === window) {
          clientX = moveEvent.clientX - iframeRect.left;
          clientY = moveEvent.clientY - iframeRect.top;
        }

        const hovered = iframeDoc.elementFromPoint(clientX, clientY) as HTMLElement | null;

        if (hovered && hovered !== iframeDoc.body && hovered !== iframeDoc.documentElement && !selected.contains(hovered)) {
          lastHoveredEl = hovered;
          
          const hoveredRect = hovered.getBoundingClientRect();
          const relativeY = clientY - hoveredRect.top;
          
          const containerTags = ['section', 'div', 'header', 'footer', 'main', 'aside', 'article'];
          const isContainer = containerTags.includes(hovered.tagName.toLowerCase());

          // Decide placement based on mouse position relative to hovered element bounds
          if (isContainer && relativeY > hoveredRect.height * 0.25 && relativeY < hoveredRect.height * 0.75) {
            lastPlacement = 'append';
            hovered.style.outline = '2px dashed #8b5cf6';
            if (dropIndicator.parentNode) dropIndicator.remove();
          } else {
            // Edge areas: insert before or after sibling
            if (relativeY < hoveredRect.height * 0.5) {
              lastPlacement = 'before';
              hovered.parentNode?.insertBefore(dropIndicator, hovered);
            } else {
              lastPlacement = 'after';
              hovered.parentNode?.insertBefore(dropIndicator, hovered.nextSibling);
            }
            hovered.style.outline = '';
          }
        } else {
          if (dropIndicator.parentNode) dropIndicator.remove();
          if (lastHoveredEl) lastHoveredEl.style.outline = '';
          lastHoveredEl = null;
        }
        
        this.updateOverlayPosition();
      };

      const onMouseUp = () => {
        this.label.style.cursor = 'grab';
        selected.style.pointerEvents = originalPointerEvents;

        // Clean up temporary UI styles
        if (dropIndicator.parentNode) dropIndicator.remove();
        if (lastHoveredEl) lastHoveredEl.style.outline = '';

        // Execute visual DOM node repositioning
        if (lastHoveredEl) {
          if (lastPlacement === 'append') {
            lastHoveredEl.appendChild(selected);
          } else if (lastPlacement === 'before') {
            lastHoveredEl.parentNode?.insertBefore(selected, lastHoveredEl);
          } else if (lastPlacement === 'after') {
            lastHoveredEl.parentNode?.insertBefore(selected, lastHoveredEl.nextSibling);
          }

          // Strip absolute layout attributes to protect flow-based responsive code
          selected.style.position = '';
          selected.style.left = '';
          selected.style.top = '';
          selected.style.right = '';
          selected.style.bottom = '';
          selected.style.transform = '';
          
          this.selectElement(selected);
          this.notifyChanges();
        }

        // Unbind event listeners
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        iframeDoc.removeEventListener('mousemove', onMouseMove);
        iframeDoc.removeEventListener('mouseup', onMouseUp);
      };

      // Bind to both windows for flawless event capturing across iframe boundaries
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      iframeDoc.addEventListener('mousemove', onMouseMove);
      iframeDoc.addEventListener('mouseup', onMouseUp);
    });
  }

  private notifyChanges() {
    if (this.onCanvasChangedCallback) {
      this.onCanvasChangedCallback(this.getContent());
    }
  }
}
