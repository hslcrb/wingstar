import { CanvasManager } from './editor/canvas';
import { PropertiesManager } from './editor/properties';
import { CodeEditorManager } from './editor/code-editor';
import { parseEPS } from './editor/eps-parser';
import { parseSVG, VectorNode } from './editor/svg-parser';
import { compileVectorToHTML } from './editor/vector-compiler';
import { initPanelResizers } from './editor/panel-resizer';
import { DrawingToolManager, DrawMode } from './editor/drawing-tool';
import { LayerPanel } from './editor/layer-panel';
import { UndoManager } from './editor/undo-manager';
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
  // 4. Undo/Redo Manager
  // ─────────────────────────────────────────────
  const undoManager = new UndoManager({
    onRestore: (html) => {
      canvasManager.setContent(html);
      codeEditorManager.setCode(html);
      projectPages[activePageName] = html;
      updateVectorLayersTreeFromCanvas();
    }
  });

  function pushUndoState() {
    const html = canvasManager.getContent();
    if (html) undoManager.pushState(html);
  }

  // ─────────────────────────────────────────────
  // 5. Bidirectional Syncing
  // ─────────────────────────────────────────────

  // Canvas interactions update Property Inspector & Code Editor
  canvasManager.onElementSelected((el) => {
    propertiesManager.bindElement(el);
  });

  canvasManager.onCanvasChanged((newHTML) => {
    projectPages[activePageName] = newHTML;
    codeEditorManager.setCode(newHTML);
    updateVectorLayersTreeFromCanvas();
    pushUndoState();
  });

  // Property Inspector updates sync back to Visual Canvas
  propertiesManager.onStyleChanged(() => {
    canvasManager.updateOverlayPosition();
    const currentHTML = canvasManager.getContent();
    projectPages[activePageName] = currentHTML;
    codeEditorManager.setCode(currentHTML);
    pushUndoState();
  });

  // Code editor typing updates Visual Canvas (debounced to avoid iframe flashing)
  codeEditorManager.onCodeChanged((newCode) => {
    clearTimeout(codeChangeTimeout);
    
    const syncStatus = document.getElementById('code-sync-status');
    if (syncStatus) {
      syncStatus.textContent = '입력 중…';
      syncStatus.style.color = 'var(--accent)';
    }

    codeChangeTimeout = setTimeout(() => {
      canvasManager.setContent(newCode);
      projectPages[activePageName] = newCode;
      if (syncStatus) {
        syncStatus.textContent = '동기화 완료';
        syncStatus.style.color = 'var(--success)';
      }
      updateVectorLayersTreeFromCanvas();
      pushUndoState();
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
        <button class="page-delete-btn" title="페이지 삭제" data-delete-page="${pageName}">
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
          if (confirm(`"${target}"을(를) 삭제하시겠습니까? 되돌릴 수 없습니다.`)) {
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
    let newName = prompt('새 페이지 파일명을 입력하세요 (예: about.html):');
    if (!newName) return;
    newName = newName.trim();
    if (!newName.endsWith('.html')) newName += '.html';
    // Sanitize filename
    newName = newName.replace(/[^a-zA-Z0-9._-]/g, '_');

    if (projectPages[newName]) {
      alert(`"${newName}" 페이지가 이미 존재합니다.`);
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
  // 11. Vector Graphics Importer (SVG & EPS)
  // ─────────────────────────────────────────────
  const btnImportVector = document.getElementById('btn-import-vector') as HTMLElement;
  btnImportVector.addEventListener('click', async () => {
    const loadingToast = document.getElementById('toast-message') as HTMLElement;
    try {
      const file = await window.electronAPI.openFile();
      if (!file) return;

      if (loadingToast) {
        loadingToast.textContent = '벡터 파일 불러오는 중…';
        loadingToast.classList.remove('hidden', 'toast-error');
        loadingToast.classList.add('toast-visible');
      }

      let svgMarkup = '';

      if (file.isEPS) {
        const parsed = parseEPS(file.content);

        if (parsed.rawSvg) {
          svgMarkup = parsed.rawSvg;
        } else {
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
        svgMarkup = file.content;
      }

      const shouldCompileToHtml = confirm(
        'Import vector data as editable HTML layout (div, span, button)?\n\n[OK] - Compile to editable HTML layout\n[Cancel] - Insert as raw SVG'
      );

      if (loadingToast) {
        loadingToast.textContent = shouldCompileToHtml ? 'HTML 레이아웃 변환 중…' : '벡터 삽입 중…';
      }

      const parser = new DOMParser();
      const frameEl = document.getElementById('editor-frame') as HTMLIFrameElement;

      if (shouldCompileToHtml) {
        const compiledHtml = compileVectorToHTML(svgMarkup);
        const currentHtml = canvasManager.getContent();
        const injected = currentHtml.replace('</body>', `\n${compiledHtml}\n</body>`);

        const afterLoad = () => {
          frameEl.removeEventListener('load', afterLoad);
          const frameDoc = frameEl.contentDocument;
          if (frameDoc) {
            const inserted = frameDoc.querySelector('.compiled-vector-layout') as HTMLElement;
            if (inserted) canvasManager.selectElement(inserted);
          }
          projectPages[activePageName] = injected;
          codeEditorManager.setCode(injected);
          if (loadingToast) loadingToast.classList.remove('toast-visible');
          confetti({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0 } });
          confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1 } });
          const compTabBtn = document.querySelector('.tab-link[data-tab="tab-components"]') as HTMLElement;
          if (compTabBtn) compTabBtn.click();
        };
        frameEl.addEventListener('load', afterLoad);
        canvasManager.setContent(injected);
      } else {
        const doc = parser.parseFromString(svgMarkup, 'image/svg+xml');
        const rootSvg = doc.querySelector('svg');
        if (!rootSvg) {
          alert('유효하지 않은 SVG 벡터 데이터입니다.');
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
        const currentHtml = canvasManager.getContent();
        const injected = currentHtml.replace('</body>', `\n${trackedSvgMarkup}\n</body>`);

        const afterLoad = () => {
          frameEl.removeEventListener('load', afterLoad);
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
          projectPages[activePageName] = injected;
          codeEditorManager.setCode(injected);
          if (loadingToast) loadingToast.classList.remove('toast-visible');
          confetti({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0 } });
          confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1 } });
        };
        frameEl.addEventListener('load', afterLoad);
        canvasManager.setContent(injected);
      }
    } catch (err: any) {
      if (loadingToast) {
        loadingToast.textContent = `가져오기 실패: ${err.message}`;
        loadingToast.classList.add('toast-error');
      }
      alert(`가져오기 오류: ${err.message}`);
    }
  });

  // ─────────────────────────────────────────────
  // 11. Layer Panel (Universal DOM Tree)
  // ─────────────────────────────────────────────
  const layerPanel = new LayerPanel('vector-layers-tree', 'vector-status', {
    onSelect: (el) => canvasManager.selectElement(el),
    onReorder: () => {
      const html = canvasManager.getContent();
      projectPages[activePageName] = html;
      codeEditorManager.setCode(html);
    }
  });

  function refreshLayerPanel() {
    const iframe = document.getElementById('editor-frame') as HTMLIFrameElement;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    layerPanel.refresh(doc, canvasManager.getSelectedElement());
  }

  function updateVectorLayersTreeFromCanvas() {
    refreshLayerPanel();
  }

  // ─────────────────────────────────────────────
  // 12. Toolbar Button Commands
  // ─────────────────────────────────────────────
  
  // Clear / Reset to standard page
  const btnNewProject = document.getElementById('btn-new-project') as HTMLElement;
  btnNewProject.addEventListener('click', () => {
    if (confirm('새 프로젝트를 만드시겠습니까? 저장하지 않은 페이지는 모두 사라집니다.')) {
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
      alert(`HTML 내보내기 실패: ${err.message}`);
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
        alert(`✅ ${result.pageCount}개 페이지를 내보냈습니다:\n${result.dirPath}`);
      }
    } catch (err: any) {
      alert(`프로젝트 내보내기 실패: ${err.message}`);
    }
  });

  // Open Preview in External Web Browser
  const btnPreviewBrowser = document.getElementById('btn-preview-browser') as HTMLElement;
  btnPreviewBrowser.addEventListener('click', async () => {
    const currentCode = codeEditorManager.getCode();
    try {
      const result = await window.electronAPI.saveHTML('wingstar-preview.html', currentCode);
      if (result && result.success) {
        alert(`미리보기 파일을 저장했습니다:\n${result.filePath}\n웹 브라우저에서 직접 열어 테스트할 수 있습니다.`);
      }
    } catch (err: any) {
      alert(`미리보기 파일 저장 실패: ${err.message}`);
    }
  });

  // Initialize panel resizers
  initPanelResizers(canvasManager);

  // ─────────────────────────────────────────────
  // 14. Drawing Tools
  // ─────────────────────────────────────────────
  const drawingTool = new DrawingToolManager({
    onElementCreated: (el) => {
      canvasManager.selectElement(el);
    },
    onCanvasChanged: () => {
      const html = canvasManager.getContent();
      projectPages[activePageName] = html;
      codeEditorManager.setCode(html);
      updateVectorLayersTreeFromCanvas();
    }
  });

  const drawToolBtns = document.querySelectorAll('.draw-tool-btn');
  drawToolBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      drawToolBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tool = btn.getAttribute('data-draw-tool') as DrawMode;
      drawingTool.setMode(tool);
      canvasManager.setDrawMode(tool);
    });
  });

  // Sync iframe document with drawing tool on canvas content changes
  const originalSetContent = canvasManager.setContent.bind(canvasManager);
  canvasManager.setContent = (html: string) => {
    originalSetContent(html);
    const iframe = document.getElementById('editor-frame') as HTMLIFrameElement;
    const checkDoc = () => {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc && doc.body) {
        drawingTool.setIframeDoc(doc);
      } else {
        setTimeout(checkDoc, 50);
      }
    };
    checkDoc();
  };

  // Initial iframe doc sync
  const initIframeDoc = () => {
    const iframe = document.getElementById('editor-frame') as HTMLIFrameElement;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc && doc.body) {
      drawingTool.setIframeDoc(doc);
      pushUndoState();
    } else {
      setTimeout(initIframeDoc, 100);
    }
  };
  initIframeDoc();

  // ─────────────────────────────────────────────
  // 15. Keyboard Shortcuts
  // ─────────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    const ctrl = e.ctrlKey || e.metaKey;

    if (ctrl && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undoManager.undo();
    }
    if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      undoManager.redo();
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && !ctrl) {
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT' || active.isContentEditable)) return;
      e.preventDefault();
      const sel = canvasManager.getSelectedElement();
      if (sel && sel.parentNode) {
        sel.remove();
        canvasManager.selectElement(null);
        const html = canvasManager.getContent();
        projectPages[activePageName] = html;
        codeEditorManager.setCode(html);
        pushUndoState();
      }
    }
  });
});
