import { CanvasManager } from './editor/canvas';
import { PropertiesManager } from './editor/properties';
import { CodeEditorManager } from './editor/code-editor';
import { parseEPS } from './editor/eps-parser';
import { parseSVG, VectorNode } from './editor/svg-parser';
import { defaultHTML } from './editor/templates';
import confetti from 'canvas-confetti';
import { ElectronAPI } from '../main/preload';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Layout Managers
  const canvasManager = new CanvasManager('editor-frame', 'selection-overlay');
  const propertiesManager = new PropertiesManager();
  const codeEditorManager = new CodeEditorManager('monaco-editor-container');

  // Debounced raw code editor update to canvas
  let codeChangeTimeout: NodeJS.Timeout;
  const DEBOUNCE_DELAY = 600;

  // Track parsed vector root for layers tree mapping
  let activeVectorRoot: VectorNode | null = null;

  // 2. Initialize Code Editor and Load Default Template
  codeEditorManager.init(defaultHTML, () => {
    // Once Monaco Editor is ready, load content into canvas and dismiss splash
    canvasManager.setContent(defaultHTML);
    
    setTimeout(() => {
      const splash = document.getElementById('splash-screen');
      if (splash) {
        splash.classList.add('fade-out');
      }
    }, 1200);
  });

  // 3. Bidirectional Syncing
  
  // Canvas interactions update Property Inspector & Code Editor
  canvasManager.onElementSelected((el) => {
    propertiesManager.bindElement(el);
  });

  canvasManager.onCanvasChanged((newHTML) => {
    // Update code editor immediately during visual updates
    codeEditorManager.setCode(newHTML);
    updateVectorLayersTreeFromCanvas();
  });

  // Property Inspector updates sync back to Visual Canvas
  propertiesManager.onStyleChanged(() => {
    canvasManager.updateOverlayPosition();
    const currentHTML = canvasManager.getContent();
    codeEditorManager.setCode(currentHTML);
  });

  // Code editor typing updates Visual Canvas (debounced to avoid iframe flashing)
  codeEditorManager.onCodeChanged((newCode) => {
    clearTimeout(codeChangeTimeout);
    
    const syncStatus = document.getElementById('code-sync-status');
    if (syncStatus) {
      syncStatus.textContent = 'Typing...';
      syncStatus.style.color = 'var(--accent)';
    }

    codeChangeTimeout = setTimeout(() => {
      canvasManager.setContent(newCode);
      if (syncStatus) {
        syncStatus.textContent = 'Synced';
        syncStatus.style.color = 'var(--success)';
      }
      // Re-evaluate layers tree in case SVG markup was modified
      updateVectorLayersTreeFromCanvas();
    }, DEBOUNCE_DELAY);
  });

  // 4. Sidebar Tabs Controller
  const tabLinks = document.querySelectorAll('.tab-link');
  tabLinks.forEach(link => {
    link.addEventListener('click', () => {
      tabLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      const targetTabId = link.getAttribute('data-tab');
      const tabContents = document.querySelectorAll('.tab-content');
      tabContents.forEach(content => {
        if (content.id === targetTabId) {
          content.classList.add('active');
        } else {
          content.classList.remove('active');
        }
      });
    });
  });

  // 5. Sidebar Component Drag events
  const compItems = document.querySelectorAll('.component-item');
  compItems.forEach(item => {
    item.setAttribute('draggable', 'true');
    item.addEventListener('dragstart', (e: any) => {
      const type = item.getAttribute('data-type') || '';
      e.dataTransfer.setData('text/plain', type);
    });
  });

  // 6. Split Code Panel Toggle
  const btnToggleSplit = document.getElementById('btn-toggle-split') as HTMLElement;
  const codeEditorPanel = document.getElementById('code-editor-panel') as HTMLElement;
  
  btnToggleSplit.addEventListener('click', () => {
    btnToggleSplit.classList.toggle('active');
    codeEditorPanel.classList.toggle('hidden');
    
    // Reposition selection handles once flex layout settles
    setTimeout(() => {
      canvasManager.updateOverlayPosition();
    }, 200);
  });

  // Formatting HTML action
  const btnFormatCode = document.getElementById('btn-format-code') as HTMLElement;
  btnFormatCode.addEventListener('click', () => {
    codeEditorManager.formatCode();
  });

  // 7. Vector Graphics Importer (SVG & EPS)
  const btnImportVector = document.getElementById('btn-import-vector') as HTMLElement;
  
  btnImportVector.addEventListener('click', async () => {
    try {
      const file = await window.electronAPI.openFile();
      if (!file) return;

      let svgMarkup = '';

      if (file.isEPS) {
        // Run custom stack PostScript parser
        const parsed = parseEPS(file.content);
        
        if (parsed.rawSvg) {
          svgMarkup = parsed.rawSvg;
        } else {
          // Wrap paths in responsive SVG container
          const pathsMarkup = parsed.paths.map(p => {
            const idAttr = p.id ? ` id="${p.id}" data-name="${p.id}"` : '';
            const fillAttr = p.fill ? ` fill="${p.fill}"` : ' fill="#ffffff"';
            const strokeAttr = p.stroke !== 'none' ? ` stroke="${p.stroke}"` : '';
            const swAttr = p.strokeWidth ? ` stroke-width="${p.strokeWidth}"` : '';
            return `    <path d="${p.d}"${idAttr}${fillAttr}${strokeAttr}${swAttr} />`;
          }).join('\n');

          svgMarkup = `
<svg id="eps-${Date.now()}" viewBox="0 0 ${parsed.width} ${parsed.height}" width="200" height="200" style="display: block; margin: 30px auto;">
${pathsMarkup}
</svg>`;
        }
      } else {
        // Standard SVG
        svgMarkup = file.content;
      }

      // Inject tracking IDs into the parsed markup so we can link tree node to iframe DOM
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgMarkup, 'image/svg+xml');
      const rootSvg = doc.querySelector('svg');
      if (!rootSvg) {
        alert('Invalid SVG vector data loaded.');
        return;
      }

      let trackingCounter = 0;
      const assignTrackingIds = (el: Element) => {
        const trackingId = `vtrack-${Date.now()}-${trackingCounter++}`;
        el.setAttribute('data-vnode-id', trackingId);
        
        for (let i = 0; i < el.children.length; i++) {
          assignTrackingIds(el.children[i]);
        }
      };
      assignTrackingIds(rootSvg);

      // Extract the updated XML string
      const trackedSvgMarkup = rootSvg.outerHTML;

      // Add to Canvas Body
      const iframeDoc = (document.getElementById('editor-frame') as HTMLIFrameElement).contentDocument;
      if (iframeDoc) {
        const tempDiv = iframeDoc.createElement('div');
        tempDiv.innerHTML = trackedSvgMarkup.trim();
        const newSvgNode = tempDiv.firstChild as HTMLElement;
        iframeDoc.body.appendChild(newSvgNode);
        
        // Trigger select and sync changes
        canvasManager.selectElement(newSvgNode);
        const currentHTML = canvasManager.getContent();
        codeEditorManager.setCode(currentHTML);
        
        // Parse node tree for Layer tree sidebar panel
        activeVectorRoot = parseSVG(trackedSvgMarkup);
        renderLayersTree();

        // Switch to Vectors Tab in Sidebar
        const vectorsTabBtn = document.querySelector('.tab-link[data-tab="tab-vectors"]') as HTMLElement;
        if (vectorsTabBtn) {
          vectorsTabBtn.click();
        }

        // Celebrate success
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 }
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 }
        });
      }
    } catch (err: any) {
      alert(`Import error: ${err.message}`);
    }
  });

  // Render vector structure sidebar tree
  function renderLayersTree() {
    const treeContainer = document.getElementById('vector-layers-tree') as HTMLElement;
    const badge = document.getElementById('vector-status') as HTMLElement;
    
    if (!activeVectorRoot) {
      treeContainer.innerHTML = '<div class="tree-placeholder">No vector imported. Drag & Drop a .svg or .eps file or click "Import Vector" to load.</div>';
      badge.textContent = 'Empty';
      return;
    }

    treeContainer.innerHTML = '';
    badge.textContent = 'Loaded';

    const buildTreeHTML = (node: VectorNode, depth: number): HTMLElement => {
      const itemEl = document.createElement('div');
      itemEl.className = 'layer-tree-item';
      itemEl.style.paddingLeft = `${depth * 14 + 8}px`;
      itemEl.setAttribute('data-vnode-id', node.id);

      const hasId = node.svgId !== undefined;

      itemEl.innerHTML = `
        <div class="layer-info">
          <span class="layer-icon">${node.type}</span>
          <span class="layer-name">${node.name}</span>
        </div>
        ${hasId ? `<span class="layer-id-badge">${node.svgId}</span>` : ''}
      `;

      // Select element on canvas when clicked in layers list
      itemEl.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Highlight active sidebar item
        treeContainer.querySelectorAll('.layer-tree-item').forEach(el => el.classList.remove('selected'));
        itemEl.classList.add('selected');

        const iframeDoc = (document.getElementById('editor-frame') as HTMLIFrameElement).contentDocument;
        if (iframeDoc) {
          // Find matching node inside iframe DOM using our tracking ID
          // Look for data-vnode-id that matches this node's tracking key
          const originalRootTrackId = activeVectorRoot?.attributes['data-vnode-id'];
          const nodeOffset = parseInt(node.id.split('-')[1]); // Node Index
          
          // Query by attribute
          const matchEl = iframeDoc.querySelector(`[data-vnode-id^="vtrack-"][data-vnode-id$="-${nodeOffset}"]`);
          if (matchEl) {
            canvasManager.selectElement(matchEl as HTMLElement);
          }
        }
      });

      return itemEl;
    };

    const renderNodeRecursive = (node: VectorNode, depth: number) => {
      const itemNode = buildTreeHTML(node, depth);
      treeContainer.appendChild(itemNode);

      if (node.children) {
        node.children.forEach(child => renderNodeRecursive(child, depth + 1));
      }
    };

    renderNodeRecursive(activeVectorRoot, 0);
  }

  // Scan current Canvas DOM for any SVGs to reconstruct Vector Tree in case code edits happened
  function updateVectorLayersTreeFromCanvas() {
    const iframeDoc = (document.getElementById('editor-frame') as HTMLIFrameElement).contentDocument;
    if (!iframeDoc) return;

    const svg = iframeDoc.querySelector('svg:not(.wingstar-glow-logo)');
    if (svg) {
      // Re-assign tracking IDs if missing
      let trackingCounter = 0;
      const rootTrackAttr = svg.getAttribute('data-vnode-id');
      
      if (!rootTrackAttr) {
        const assignTracking = (el: Element) => {
          el.setAttribute('data-vnode-id', `vtrack-${Date.now()}-${trackingCounter++}`);
          for (let i = 0; i < el.children.length; i++) {
            assignTracking(el.children[i]);
          }
        };
        assignTracking(svg);
      }

      activeVectorRoot = parseSVG(svg.outerHTML);
      renderLayersTree();
    } else {
      activeVectorRoot = null;
      renderLayersTree();
    }
  }

  // 8. Toolbar Button Commands
  
  // Clear / Reset to standard page
  const btnNewProject = document.getElementById('btn-new-project') as HTMLElement;
  btnNewProject.addEventListener('click', () => {
    if (confirm('Create a new page? Any unsaved changes in the current workspace will be discarded.')) {
      canvasManager.setContent(defaultHTML);
      codeEditorManager.setCode(defaultHTML);
      canvasManager.selectElement(null);
      activeVectorRoot = null;
      renderLayersTree();
    }
  });

  // Export HTML File
  const btnExportHTML = document.getElementById('btn-export-html') as HTMLElement;
  btnExportHTML.addEventListener('click', async () => {
    const currentCode = canvasManager.getContent();
    try {
      const result = await window.electronAPI.saveHTML('wingstar-page.html', currentCode);
      if (result && result.success) {
        confetti({ particleCount: 80, spread: 60 });
      }
    } catch (err: any) {
      alert(`Export HTML failed: ${err.message}`);
    }
  });

  // Export Full Project Folder (HTML + CSS extracted)
  const btnExportProject = document.getElementById('btn-export-project') as HTMLElement;
  btnExportProject.addEventListener('click', async () => {
    const docText = canvasManager.getContent();
    
    // Extract style block contents
    const parser = new DOMParser();
    const doc = parser.parseFromString(docText, 'text/html');
    const styleEl = doc.getElementById('project-styles');
    let css = '';
    
    if (styleEl) {
      css = styleEl.innerHTML.trim();
      styleEl.remove(); // Remove raw CSS block in output HTML to links style.css instead
    }

    // Output clean HTML
    const html = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;

    try {
      const result = await window.electronAPI.exportProject({ html, css });
      if (result && result.success) {
        confetti({
          particleCount: 150,
          spread: 80,
          colors: ['#c084fc', '#fbbf24', '#22d3ee']
        });
      }
    } catch (err: any) {
      alert(`Project Export failed: ${err.message}`);
    }
  });

  // Open Preview in External Web Browser
  const btnPreviewBrowser = document.getElementById('btn-preview-browser') as HTMLElement;
  btnPreviewBrowser.addEventListener('click', async () => {
    // Generate a temporary file and save, then let user open it
    const currentCode = canvasManager.getContent();
    try {
      const result = await window.electronAPI.saveHTML('wingstar-preview.html', currentCode);
      if (result && result.success) {
        // Feedback success
        alert(`Saved preview to: ${result.filePath}\nYou can load this file directly in any browser for live responsive testing.`);
      }
    } catch (err: any) {
      alert(`Failed to save preview file: ${err.message}`);
    }
  });
});
