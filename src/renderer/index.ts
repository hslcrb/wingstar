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
  let codeChangeTimeout: ReturnType<typeof setTimeout>;
  const DEBOUNCE_DELAY = 600;

  // Track parsed vector root for layers tree mapping
  let activeVectorRoot: VectorNode | null = null;

  // ─────────────────────────────────────────────
  // 2. Multi-Page State
  // ─────────────────────────────────────────────
  let projectPages: { [filename: string]: string } = {
    'index.html': defaultHTML
  };
  let activePageName = 'index.html';

  // ─────────────────────────────────────────────
  // 3. Initialize Code Editor and Load Default Template
  // ─────────────────────────────────────────────
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

  // ─────────────────────────────────────────────
  // 4. Bidirectional Syncing
  // ─────────────────────────────────────────────

  // Canvas interactions update Property Inspector & Code Editor
  canvasManager.onElementSelected((el) => {
    propertiesManager.bindElement(el);
  });

  canvasManager.onCanvasChanged((newHTML) => {
    projectPages[activePageName] = newHTML;
    codeEditorManager.setCode(newHTML);
    updateVectorLayersTreeFromCanvas();
  });

  // Property Inspector updates sync back to Visual Canvas
  propertiesManager.onStyleChanged(() => {
    canvasManager.updateOverlayPosition();
    const currentHTML = canvasManager.getContent();
    projectPages[activePageName] = currentHTML;
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
      projectPages[activePageName] = newCode;
      if (syncStatus) {
        syncStatus.textContent = 'Synced';
        syncStatus.style.color = 'var(--success)';
      }
      updateVectorLayersTreeFromCanvas();
    }, DEBOUNCE_DELAY);
  });

  // ─────────────────────────────────────────────
  // 5. Sidebar Tabs Controller
  // ─────────────────────────────────────────────
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

  // ─────────────────────────────────────────────
  // 6. Sidebar Component Drag events
  // ─────────────────────────────────────────────
  const compItems = document.querySelectorAll('.component-item');
  compItems.forEach(item => {
    item.setAttribute('draggable', 'true');
    item.addEventListener('dragstart', (e: any) => {
      const type = item.getAttribute('data-type') || '';
      e.dataTransfer.setData('text/plain', type);
    });
  });

  // ─────────────────────────────────────────────
  // 7. Split Code Panel Toggle
  // ─────────────────────────────────────────────
  const btnToggleSplit = document.getElementById('btn-toggle-split') as HTMLElement;
  const codeEditorPanel = document.getElementById('code-editor-panel') as HTMLElement;
  
  btnToggleSplit.addEventListener('click', () => {
    btnToggleSplit.classList.toggle('active');
    codeEditorPanel.classList.toggle('hidden');
    
    setTimeout(() => {
      canvasManager.updateOverlayPosition();
    }, 200);
  });

  // Formatting HTML action
  const btnFormatCode = document.getElementById('btn-format-code') as HTMLElement;
  btnFormatCode.addEventListener('click', () => {
    codeEditorManager.formatCode();
  });

  // ─────────────────────────────────────────────
  // 8. Live / Design Mode Toggle
  // ─────────────────────────────────────────────
  const btnToggleLive = document.getElementById('btn-toggle-live') as HTMLElement;
  const canvasWrapper = document.getElementById('canvas-wrapper') as HTMLElement;

  btnToggleLive.addEventListener('click', () => {
    const isCurrentlyLive = canvasManager.getLiveMode();
    const willBeLive = !isCurrentlyLive;

    canvasManager.setLiveMode(willBeLive);

    if (willBeLive) {
      btnToggleLive.classList.add('live-active');
      btnToggleLive.innerHTML = `
        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
        Live
      `;
      canvasWrapper.classList.add('live-mode');
    } else {
      btnToggleLive.classList.remove('live-active');
      btnToggleLive.innerHTML = `
        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
          <circle cx="12" cy="12" r="10"></circle>
          <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"></polygon>
        </svg>
        Design
      `;
      canvasWrapper.classList.remove('live-mode');
    }
  });

  // ─────────────────────────────────────────────
  // 9. Multi-Page Project Management
  // ─────────────────────────────────────────────
  const pagesList = document.getElementById('pages-list') as HTMLElement;
  const btnAddPage = document.getElementById('btn-add-page') as HTMLElement;

  function renderPagesList() {
    pagesList.innerHTML = '';
    for (const pageName of Object.keys(projectPages)) {
      const item = document.createElement('div');
      item.className = `page-item${pageName === activePageName ? ' active' : ''}`;
      item.setAttribute('data-page', pageName);

      const isIndex = pageName === 'index.html';
      item.innerHTML = `
        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
        <span class="page-name">${pageName}</span>
        ${!isIndex ? `
        <button class="page-delete-btn" title="Delete page" data-delete-page="${pageName}">
          <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" stroke-width="2.5" fill="none">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>` : ''}
      `;

      // Switch to page on click
      item.addEventListener('click', (e) => {
        const deleteTarget = (e.target as HTMLElement).closest('[data-delete-page]');
        if (deleteTarget) return; // handled below
        switchToPage(pageName);
      });

      // Delete page button
      const deleteBtn = item.querySelector('[data-delete-page]');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const target = (e.currentTarget as HTMLElement).getAttribute('data-delete-page')!;
          if (confirm(`Delete "${target}"? This cannot be undone.`)) {
            delete projectPages[target];
            if (activePageName === target) {
              switchToPage('index.html');
            }
            renderPagesList();
          }
        });
      }

      pagesList.appendChild(item);
    }
  }

  function switchToPage(pageName: string) {
    // Save current page state
    const currentCode = codeEditorManager.getCode();
    projectPages[activePageName] = currentCode;

    activePageName = pageName;

    // Load new page
    const pageContent = projectPages[activePageName];
    canvasManager.setContent(pageContent);
    codeEditorManager.setCode(pageContent);
    canvasManager.selectElement(null);
    activeVectorRoot = null;
    renderLayersTree();
    renderPagesList();
  }

  btnAddPage.addEventListener('click', () => {
    let newName = prompt('Enter new page filename (e.g. about.html):');
    if (!newName) return;
    newName = newName.trim();
    if (!newName.endsWith('.html')) newName += '.html';
    // Sanitize filename
    newName = newName.replace(/[^a-zA-Z0-9._-]/g, '_');

    if (projectPages[newName]) {
      alert(`Page "${newName}" already exists.`);
      return;
    }

    // Create a fresh blank starter page
    const blankPage = defaultHTML.replace('WingStar Project', newName.replace('.html', ''));
    projectPages[newName] = blankPage;
    renderPagesList();
    switchToPage(newName);

    // Switch pages tab into view
    const pagesTabBtn = document.querySelector('.tab-link[data-tab="tab-pages"]') as HTMLElement;
    if (pagesTabBtn) pagesTabBtn.click();
  });

  // Initial render
  renderPagesList();

  // ─────────────────────────────────────────────
  // 10. Vector-to-HTML Layout Compiler
  // ─────────────────────────────────────────────
  function compileVectorToHTML(svgMarkup: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgMarkup, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    if (!svg) return svgMarkup;

    function getStyle(el: Element, attr: string, defaultValue = ''): string {
      const direct = el.getAttribute(attr);
      if (direct) return direct;
      
      const styleAttr = el.getAttribute('style');
      if (styleAttr) {
        const match = styleAttr.match(new RegExp(`(?:^|;)\\s*${attr}\\s*:\\s*([^;]+)`));
        if (match) return match[1].trim();
      }
      return defaultValue;
    }

    function parseColor(color: string) {
      if (!color || color === 'none' || color === 'transparent') return 'transparent';
      return color;
    }

    function colorToHex(color: string): string {
      if (!color || color === 'none' || color === 'transparent') return 'transparent';
      if (color.startsWith('#')) return color;
      const match = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (match) {
        const r = parseInt(match[1]).toString(16).padStart(2, '0');
        const g = parseInt(match[2]).toString(16).padStart(2, '0');
        const b = parseInt(match[3]).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
      }
      return color;
    }

    function processNode(node: Element): string {
      const tagName = node.tagName.toLowerCase();
      const id = node.getAttribute('id') || node.getAttribute('data-name') || '';
      const idAttr = id ? ` id="${id}"` : '';

      if (tagName === 'g') {
        const childrenHtml = Array.from(node.children).map(child => processNode(child)).join('\n');
        const hasText = node.querySelector('text') !== null;
        const hasShape = node.querySelector('rect, circle, ellipse') !== null;
        
        if (hasText && hasShape) {
          return `
<button${idAttr} class="btn" style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 16px; border-radius: 6px; border: 1px solid var(--border-color, #232335); background-color: var(--bg-input, #1a1a26); color: var(--text-main, #f1f1f7); cursor: pointer; transition: all 0.2s ease;">
  ${childrenHtml}
</button>`.trim();
        }
        
        return `<div${idAttr} class="vector-group" style="display: flex; flex-direction: column; gap: 8px; position: relative;">\n${childrenHtml}\n</div>`;
      }

      if (tagName === 'text') {
        const fontSize = getStyle(node, 'font-size', '14px');
        const fontFamily = getStyle(node, 'font-family', 'inherit');
        const fill = colorToHex(getStyle(node, 'fill', '#ffffff'));
        const textContent = node.textContent || 'Text';

        return `<span${idAttr} style="font-size: ${fontSize}; font-family: ${fontFamily}; color: ${fill}; font-weight: 500; display: inline-block;">${textContent}</span>`;
      }

      if (tagName === 'rect') {
        const width = node.getAttribute('width') || '80';
        const height = node.getAttribute('height') || '40';
        const fill = colorToHex(getStyle(node, 'fill', '#ffffff'));
        const stroke = colorToHex(getStyle(node, 'stroke', 'none'));
        const strokeWidth = getStyle(node, 'stroke-width', '0');
        const rx = node.getAttribute('rx') || '0';

        const borderStyle = stroke !== 'transparent' ? `border: ${strokeWidth}px solid ${stroke};` : '';
        const borderRadiusStyle = rx !== '0' ? `border-radius: ${rx}px;` : '';

        return `<div${idAttr} style="width: ${width}px; height: ${height}px; background-color: ${fill}; ${borderStyle} ${borderRadiusStyle} display: inline-block; position: relative; min-width: 10px; min-height: 10px;"></div>`;
      }

      if (tagName === 'circle' || tagName === 'ellipse') {
        const rx = tagName === 'circle' ? parseFloat(node.getAttribute('r') || '25') : parseFloat(node.getAttribute('rx') || '25');
        const ry = tagName === 'circle' ? rx : parseFloat(node.getAttribute('ry') || '25');
        const fill = colorToHex(getStyle(node, 'fill', '#ffffff'));
        const stroke = colorToHex(getStyle(node, 'stroke', 'none'));
        const strokeWidth = getStyle(node, 'stroke-width', '0');

        const borderStyle = stroke !== 'transparent' ? `border: ${strokeWidth}px solid ${stroke};` : '';

        return `<div${idAttr} style="width: ${rx * 2}px; height: ${ry * 2}px; background-color: ${fill}; ${borderStyle} border-radius: 50%; display: inline-block; position: relative;"></div>`;
      }

      if (['path', 'polygon', 'polyline', 'line'].includes(tagName)) {
        const fill = colorToHex(getStyle(node, 'fill', 'currentColor'));
        const stroke = colorToHex(getStyle(node, 'stroke', 'none'));
        const strokeWidth = getStyle(node, 'stroke-width', '0');

        let viewBox = '0 0 100 100';
        let parent = node.parentElement;
        while (parent) {
          if (parent.tagName.toLowerCase() === 'svg') {
            viewBox = parent.getAttribute('viewBox') || '0 0 100 100';
            break;
          }
          parent = parent.parentElement;
        }

        const clone = node.cloneNode(true) as Element;
        clone.removeAttribute('fill');
        clone.removeAttribute('stroke');
        clone.removeAttribute('stroke-width');

        return `
<svg${idAttr} viewBox="${viewBox}" width="32" height="32" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" style="display: inline-block; vertical-align: middle;">
  ${clone.outerHTML}
</svg>`.trim();
      }

      return '';
    }

    const childrenHtml = Array.from(svg.children).map(child => processNode(child)).join('\n');
    const rootId = svg.getAttribute('id') || `vector-layout-${Date.now()}`;

    return `
<div id="${rootId}" class="compiled-vector-layout" style="display: flex; flex-wrap: wrap; gap: 16px; align-items: center; justify-content: center; padding: 24px; border: 1px solid var(--border-color, #232335); background-color: var(--bg-panel, #12121c); border-radius: 8px;">
  ${childrenHtml}
</div>`.trim();
  }

  // ─────────────────────────────────────────────
  // 11. Vector Graphics Importer (SVG & EPS)
  // ─────────────────────────────────────────────
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

      const shouldCompileToHtml = confirm(
        "가져온 벡터(SVG/EPS) 데이터를 편집 가능한 순수 HTML 레이아웃(div, span, button)으로 즉시 변환하여 가져오겠습니까?\n\n[확인] - 편집 가능한 최적화 HTML 레이아웃으로 컴파일 변환\n[취소] - 원본 SVG로 삽입"
      );

      const parser = new DOMParser();

      if (shouldCompileToHtml) {
        // Run compiler
        const compiledHtml = compileVectorToHTML(svgMarkup);

        // 기존 HTML 코드에 새 노드를 문자열로 삽입 (iframe 직접 DOM 조작 안 함)
        const currentHtml = canvasManager.getContent();
        const injected = currentHtml.replace('</body>', `\n${compiledHtml}\n</body>`);

        canvasManager.setContent(injected);
        projectPages[activePageName] = injected;
        // setCode는 silent하게 — onCodeChanged 콜백을 유발하지 않도록
        codeEditorManager.setCode(injected);

        // iframe 로드 완료 후 첫 번째 추가된 노드를 선택
        const frameEl = document.getElementById('editor-frame') as HTMLIFrameElement;
        const selectAfterLoad = () => {
          const frameDoc = frameEl.contentDocument;
          if (frameDoc) {
            const inserted = frameDoc.querySelector('.compiled-vector-layout') as HTMLElement;
            if (inserted) {
              canvasManager.selectElement(inserted);
            }
          }
          frameEl.removeEventListener('load', selectAfterLoad);
        };
        frameEl.addEventListener('load', selectAfterLoad);

        // Switch to layout components tab
        const compTabBtn = document.querySelector('.tab-link[data-tab="tab-components"]') as HTMLElement;
        if (compTabBtn) compTabBtn.click();

        confetti({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0 } });
        confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1 } });
      } else {
        // Inject tracking IDs and insert via HTML string to avoid iframe reload race condition
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

        const trackedSvgMarkup = rootSvg.outerHTML;

        // 기존 HTML에 SVG를 문자열로 주입 → setContent로 iframe 재로드
        const currentHtml = canvasManager.getContent();
        const injected = currentHtml.replace('</body>', `\n${trackedSvgMarkup}\n</body>`);

        canvasManager.setContent(injected);
        projectPages[activePageName] = injected;
        codeEditorManager.setCode(injected);

        // iframe 로드 완료 후 삽입된 SVG 노드를 선택 상태로 설정
        const frameEl = document.getElementById('editor-frame') as HTMLIFrameElement;
        const selectSvgAfterLoad = () => {
          const frameDoc = frameEl.contentDocument;
          if (frameDoc) {
            const insertedSvg = frameDoc.querySelector(`[data-vnode-id^="vtrack-"]`) as HTMLElement;
            if (insertedSvg) {
              canvasManager.selectElement(insertedSvg);
              activeVectorRoot = parseSVG(trackedSvgMarkup);
              renderLayersTree();

              const vectorsTabBtn = document.querySelector('.tab-link[data-tab="tab-vectors"]') as HTMLElement;
              if (vectorsTabBtn) vectorsTabBtn.click();
            }
          }
          frameEl.removeEventListener('load', selectSvgAfterLoad);
        };
        frameEl.addEventListener('load', selectSvgAfterLoad);

        confetti({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0 } });
        confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1 } });
      }
    } catch (err: any) {
      alert(`Import error: ${err.message}`);
    }
  });

  // ─────────────────────────────────────────────
  // 11. Vector Layers Tree Renderer
  // ─────────────────────────────────────────────
  function renderLayersTree() {
    const treeContainer = document.getElementById('vector-layers-tree') as HTMLElement;
    const badge = document.getElementById('vector-status') as HTMLElement;
    
    if (!activeVectorRoot) {
      treeContainer.innerHTML = '<div class="tree-placeholder">No vector imported. Drag &amp; Drop a .svg or .eps file or click "Import Vector" to load.</div>';
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

      itemEl.addEventListener('click', (e) => {
        e.stopPropagation();
        
        treeContainer.querySelectorAll('.layer-tree-item').forEach(el => el.classList.remove('selected'));
        itemEl.classList.add('selected');

        const iframeDoc = (document.getElementById('editor-frame') as HTMLIFrameElement).contentDocument;
        if (iframeDoc) {
          const nodeOffset = parseInt(node.id.split('-')[1]);
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

  function updateVectorLayersTreeFromCanvas() {
    const iframeDoc = (document.getElementById('editor-frame') as HTMLIFrameElement).contentDocument;
    if (!iframeDoc) return;

    const svg = iframeDoc.querySelector('svg:not(.wingstar-glow-logo)');
    if (svg) {
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

  // ─────────────────────────────────────────────
  // 12. Toolbar Button Commands
  // ─────────────────────────────────────────────
  
  // Clear / Reset to standard page
  const btnNewProject = document.getElementById('btn-new-project') as HTMLElement;
  btnNewProject.addEventListener('click', () => {
    if (confirm('Create a new project? All unsaved pages will be discarded.')) {
      projectPages = { 'index.html': defaultHTML };
      activePageName = 'index.html';
      canvasManager.setContent(defaultHTML);
      codeEditorManager.setCode(defaultHTML);
      canvasManager.selectElement(null);
      activeVectorRoot = null;
      renderLayersTree();
      renderPagesList();
    }
  });

  // Export HTML File (current page only)
  const btnExportHTML = document.getElementById('btn-export-html') as HTMLElement;
  btnExportHTML.addEventListener('click', async () => {
    const currentCode = codeEditorManager.getCode();
    projectPages[activePageName] = currentCode;
    try {
      const result = await window.electronAPI.saveHTML(activePageName, currentCode);
      if (result && result.success) {
        confetti({ particleCount: 80, spread: 60 });
      }
    } catch (err: any) {
      alert(`Export HTML failed: ${err.message}`);
    }
  });

  // Export Full Project Folder (all pages + shared CSS)
  const btnExportProject = document.getElementById('btn-export-project') as HTMLElement;
  btnExportProject.addEventListener('click', async () => {
    // Save active page first
    const currentCode = codeEditorManager.getCode();
    projectPages[activePageName] = currentCode;

    // Extract CSS from the first page (index.html) style block
    const parser = new DOMParser();
    const indexDoc = parser.parseFromString(projectPages['index.html'] || currentCode, 'text/html');
    const styleEl = indexDoc.getElementById('project-styles');
    let css = '';
    if (styleEl) {
      css = styleEl.innerHTML.trim();
    }

    // Build pages map: remove style block from each page's HTML for cleaner output
    const cleanPages: { [filename: string]: string } = {};
    for (const [filename, html] of Object.entries(projectPages)) {
      const pageDoc = parser.parseFromString(html, 'text/html');
      const pageStyleEl = pageDoc.getElementById('project-styles');
      if (pageStyleEl) pageStyleEl.remove();
      cleanPages[filename] = '<!DOCTYPE html>\n' + pageDoc.documentElement.outerHTML;
    }

    try {
      const result = await window.electronAPI.exportProject({ pages: cleanPages, css });
      if (result && result.success) {
        confetti({
          particleCount: 150,
          spread: 80,
          colors: ['#c084fc', '#fbbf24', '#22d3ee']
        });
        alert(`✅ Exported ${result.pageCount} page(s) to:\n${result.dirPath}`);
      }
    } catch (err: any) {
      alert(`Project Export failed: ${err.message}`);
    }
  });

  // Open Preview in External Web Browser
  const btnPreviewBrowser = document.getElementById('btn-preview-browser') as HTMLElement;
  btnPreviewBrowser.addEventListener('click', async () => {
    const currentCode = codeEditorManager.getCode();
    try {
      const result = await window.electronAPI.saveHTML('wingstar-preview.html', currentCode);
      if (result && result.success) {
        alert(`Saved preview to: ${result.filePath}\nYou can load this file directly in any browser for live responsive testing.`);
      }
    } catch (err: any) {
      alert(`Failed to save preview file: ${err.message}`);
    }
  });

  // ─────────────────────────────────────────────
  // 13. Draggable Panel Resizing Interactivity
  // ─────────────────────────────────────────────
  function initPanelResizers() {
    const mainContainer = document.querySelector('.main-container') as HTMLElement;
    const resizerLeft = document.getElementById('resizer-left') as HTMLElement;
    const resizerCenter = document.getElementById('resizer-center') as HTMLElement;
    const resizerRight = document.getElementById('resizer-right') as HTMLElement;

    const leftSidebar = document.querySelector('.left-sidebar') as HTMLElement;
    const codeEditorPanel = document.getElementById('code-editor-panel') as HTMLElement;
    const rightSidebar = document.querySelector('.right-sidebar') as HTMLElement;

    // Minimum / Maximum constraints
    const MIN_LEFT = 180;
    const MAX_LEFT = 450;
    const MIN_CODE = 200;
    const MIN_RIGHT = 240;
    const MAX_RIGHT = 500;

    function setupDrag(
      resizer: HTMLElement,
      onDrag: (dx: number, startWidth: number) => void,
      getStartWidth: () => number
    ) {
      resizer.addEventListener('mousedown', (e: MouseEvent) => {
        e.preventDefault();
        
        mainContainer.classList.add('resizing');
        resizer.classList.add('dragging');

        const startX = e.clientX;
        const startWidth = getStartWidth();

        const onMouseMove = (moveEvent: MouseEvent) => {
          const dx = moveEvent.clientX - startX;
          onDrag(dx, startWidth);
          canvasManager.updateOverlayPosition();
        };

        const onMouseUp = () => {
          mainContainer.classList.remove('resizing');
          resizer.classList.remove('dragging');
          
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
          
          canvasManager.updateOverlayPosition();
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });
    }

    // 1. Left Resizer (sidebar width)
    if (resizerLeft && leftSidebar) {
      setupDrag(
        resizerLeft,
        (dx, startWidth) => {
          let newWidth = startWidth + dx;
          if (newWidth < MIN_LEFT) newWidth = MIN_LEFT;
          if (newWidth > MAX_LEFT) newWidth = MAX_LEFT;
          leftSidebar.style.width = `${newWidth}px`;
        },
        () => leftSidebar.getBoundingClientRect().width
      );
    }

    // 2. Center Resizer (monaco panel width)
    if (resizerCenter && codeEditorPanel) {
      setupDrag(
        resizerCenter,
        (dx, startWidth) => {
          if (codeEditorPanel.classList.contains('hidden')) return;
          let newWidth = startWidth + dx;
          if (newWidth < MIN_CODE) newWidth = MIN_CODE;
          codeEditorPanel.style.width = `${newWidth}px`;
        },
        () => codeEditorPanel.getBoundingClientRect().width
      );
    }

    // 3. Right Resizer (properties sidebar width)
    if (resizerRight && rightSidebar) {
      setupDrag(
        resizerRight,
        (dx, startWidth) => {
          let newWidth = startWidth - dx; // grows when moving mouse left
          if (newWidth < MIN_RIGHT) newWidth = MIN_RIGHT;
          if (newWidth > MAX_RIGHT) newWidth = MAX_RIGHT;
          rightSidebar.style.width = `${newWidth}px`;
        },
        () => rightSidebar.getBoundingClientRect().width
      );
    }
  }

  // Initialize resizers
  initPanelResizers();
});
