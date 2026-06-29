import { CanvasManager } from './editor/canvas';
import { PropertiesManager } from './editor/properties';
import { CodeEditorManager } from './editor/code-editor';
import { parseEPS } from './editor/eps-parser';
import { compileVectorToHTML } from './editor/vector-compiler';
import { initPanelResizers } from './editor/panel-resizer';
import { DrawingToolManager, DrawMode } from './editor/drawing-tool';
import { alignElement, AlignMode } from './editor/alignment';
import { LayerPanel } from './editor/layer-panel';
import { UndoManager } from './editor/undo-manager';
import { ContextMenu } from './editor/context-menu';
import { ClassManager } from './editor/class-manager';
import { loadPresets, savePreset, deletePreset, applyPreset, renderPresetList } from './editor/style-preset';
import { loadComponents, saveComponent, deleteComponent, renderComponentLibrary } from './editor/component-library';
import { initRulerGuides, clearAllGuides } from './editor/ruler-guide';
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
  // 5. Class Manager & Style Presets
  // ─────────────────────────────────────────────
  const classManager = new ClassManager('group-css-classes');
  classManager.onChange(() => {
    const html = canvasManager.getContent();
    projectPages[activePageName] = html;
    codeEditorManager.setCode(html);
    pushUndoState();
  });

  // ─────────────────────────────────────────────
  // 5b. Bidirectional Syncing
  // ─────────────────────────────────────────────

  // Canvas interactions update Property Inspector & Code Editor
  canvasManager.onElementSelected((el) => {
    propertiesManager.bindElement(el);
    classManager.bind(el);
    bindLinkProps(el);
    refreshPresetList();
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

      if (targetTabId === 'tab-components') refreshComponentLibrary();
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
  // 8. Unified Mode — always design + Ctrl+click for native
  // ─────────────────────────────────────────────
  const canvasWrapper = document.getElementById('canvas-wrapper') as HTMLElement;
  // Always in design mode; Ctrl+click passes through to iframe for links/forms

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
    refreshLayerPanel();
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
  refreshComponentLibrary();

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
        canvasManager.setContent(injected, afterLoad);
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
          const frameDoc = frameEl.contentDocument;
          if (frameDoc) {
            const insertedSvg = frameDoc.querySelector(`[data-vnode-id^="vtrack-"]`) as HTMLElement;
            if (insertedSvg) {
              canvasManager.selectElement(insertedSvg);
              refreshLayerPanel();
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
        canvasManager.setContent(injected, afterLoad);
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
  let multiSelectedElements: HTMLElement[] = [];
  const layerPanel = new LayerPanel('vector-layers-tree', 'vector-status', {
    onSelect: (el) => { canvasManager.selectElement(el); multiSelectedElements = []; },
    onMultiSelect: (els) => {
      multiSelectedElements = els;
      if (els.length > 0) canvasManager.selectElement(els[0]);
    },
    onReorder: () => {
      const html = canvasManager.getContent();
      projectPages[activePageName] = html;
      codeEditorManager.setCode(html);
      pushUndoState();
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
      refreshLayerPanel();
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

  // ─────────────────────────────────────────────
  // 15. Alignment Tools
  // ─────────────────────────────────────────────
  const alignBtns = document.querySelectorAll('.align-btn');
  alignBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const el = canvasManager.getSelectedElement();
      if (!el) return;
      const mode = btn.getAttribute('data-align') as AlignMode;
      alignElement(el, mode);
      canvasManager.updateOverlayPosition();
      const html = canvasManager.getContent();
      projectPages[activePageName] = html;
      codeEditorManager.setCode(html);
      pushUndoState();
    });
  });

  // Sync iframe document with drawing tool on canvas content changes
  const originalSetContent = canvasManager.setContent.bind(canvasManager);
  canvasManager.setContent = (html: string, onReady?: () => void) => {
    originalSetContent(html, () => {
      const iframe = document.getElementById('editor-frame') as HTMLIFrameElement;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc && doc.body) {
        drawingTool.setIframeDoc(doc);
      }
      if (onReady) onReady();
    });
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
  // 16. Canvas Zoom
  // ─────────────────────────────────────────────
  let zoomLevel = 1;
  const MIN_ZOOM = 0.25;
    const MAX_ZOOM = 4;
    const ZOOM_STEP = 0.1;
    const zoomLevelEl = document.getElementById('zoom-level') as HTMLElement;

  function applyZoom(level: number) {
    zoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, level));
    canvasWrapper.style.transform = `scale(${zoomLevel})`;
    canvasWrapper.style.transformOrigin = 'center center';
    zoomLevelEl.textContent = `${Math.round(zoomLevel * 100)}%`;
    canvasManager.updateOverlayPosition();
  }

  document.getElementById('btn-zoom-in')?.addEventListener('click', () => applyZoom(zoomLevel + ZOOM_STEP));
  document.getElementById('btn-zoom-out')?.addEventListener('click', () => applyZoom(zoomLevel - ZOOM_STEP));
  document.getElementById('btn-zoom-reset')?.addEventListener('click', () => applyZoom(1));

  canvasWrapper.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      applyZoom(zoomLevel + (e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP));
    }
  }, { passive: false });

  // ─────────────────────────────────────────────
  // 17. Copy/Paste buffer
  // ─────────────────────────────────────────────
  let clipboardHTML: string | null = null;

  // ─────────────────────────────────────────────
  // 18. Context Menu
  // ─────────────────────────────────────────────
  const contextMenu = new ContextMenu({
    copy: () => {
      const sel = canvasManager.getSelectedElement();
      if (sel) clipboardHTML = sel.outerHTML;
    },
    paste: () => {
      if (!clipboardHTML) return;
      const iframe = document.getElementById('editor-frame') as HTMLIFrameElement;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;
      const temp = doc.createElement('div');
      temp.innerHTML = clipboardHTML;
      const clone = temp.firstElementChild as HTMLElement;
      if (!clone) return;
      doc.body.appendChild(clone);
      canvasManager.selectElement(clone);
      const html = canvasManager.getContent();
      projectPages[activePageName] = html;
      codeEditorManager.setCode(html);
      pushUndoState();
    },
    delete: () => {
      const sel = canvasManager.getSelectedElement();
      if (sel && sel.parentNode) {
        sel.remove();
        canvasManager.selectElement(null);
        const html = canvasManager.getContent();
        projectPages[activePageName] = html;
        codeEditorManager.setCode(html);
        pushUndoState();
      }
    },
    group: () => {
      const sel = canvasManager.getSelectedElement();
      if (!sel || !sel.parentNode) return;
      const iframe = document.getElementById('editor-frame') as HTMLIFrameElement;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;
      const group = doc.createElement('div');
      group.className = 'wingstar-group';
      group.style.cssText = 'position:relative;border:1px dashed rgba(139,92,246,0.3);padding:4px;';
      sel.parentNode.insertBefore(group, sel);
      group.appendChild(sel);
      canvasManager.selectElement(group);
      const html = canvasManager.getContent();
      projectPages[activePageName] = html;
      codeEditorManager.setCode(html);
      pushUndoState();
    },
    ungroup: () => {
      const sel = canvasManager.getSelectedElement();
      if (!sel || sel.className !== 'wingstar-group' || !sel.parentNode) return;
      const parent = sel.parentNode;
      const children = Array.from(sel.children);
      children.forEach(child => parent.insertBefore(child, sel));
      sel.remove();
      if (children.length > 0) canvasManager.selectElement(children[0] as HTMLElement);
      else canvasManager.selectElement(null);
      const html = canvasManager.getContent();
      projectPages[activePageName] = html;
      codeEditorManager.setCode(html);
      pushUndoState();
    },
    align: (mode: string) => {
      const el = canvasManager.getSelectedElement();
      if (!el) return;
      alignElement(el, mode as AlignMode);
      canvasManager.updateOverlayPosition();
      const html = canvasManager.getContent();
      projectPages[activePageName] = html;
      codeEditorManager.setCode(html);
      pushUndoState();
    },
  });

  // Bind context menu via canvas callback
  canvasManager.onContextMenu((e: MouseEvent, el: HTMLElement | null) => {
    if (el) canvasManager.selectElement(el);
    contextMenu.show(e.clientX, e.clientY, canvasManager.getSelectedElement());
  });

  // ─────────────────────────────────────────────
  // 19. Link Properties Binding
  // ─────────────────────────────────────────────
  const linkGroup = document.getElementById('group-link-props') as HTMLElement;
  const fieldHref = document.getElementById('field-href') as HTMLElement;
  const fieldSrc = document.getElementById('field-src') as HTMLElement;
  const fieldAlt = document.getElementById('field-alt') as HTMLElement;
  const propHref = document.getElementById('prop-href') as HTMLInputElement;
  const propSrc = document.getElementById('prop-src') as HTMLInputElement;
  const propAlt = document.getElementById('prop-alt') as HTMLInputElement;

  const stylePresetGroup = document.getElementById('group-style-presets') as HTMLElement;

  function bindLinkProps(el: HTMLElement | null) {
    if (!el) {
      linkGroup.classList.add('hidden');
      stylePresetGroup.classList.add('hidden');
      return;
    }
    stylePresetGroup.classList.remove('hidden');
    const tag = el.tagName.toLowerCase();
    let hasLink = false;

    if (tag === 'a') {
      fieldHref.classList.remove('hidden');
      fieldSrc.classList.add('hidden');
      fieldAlt.classList.add('hidden');
      propHref.value = el.getAttribute('href') || '';
      hasLink = true;
    } else if (tag === 'img') {
      fieldHref.classList.add('hidden');
      fieldSrc.classList.remove('hidden');
      fieldAlt.classList.remove('hidden');
      propSrc.value = el.getAttribute('src') || '';
      propAlt.value = el.getAttribute('alt') || '';
      hasLink = true;
    } else if (tag === 'button' || tag === 'input' || tag === 'textarea') {
      fieldHref.classList.add('hidden');
      fieldSrc.classList.add('hidden');
      fieldAlt.classList.add('hidden');
      hasLink = false;
    } else {
      fieldHref.classList.remove('hidden');
      fieldSrc.classList.add('hidden');
      fieldAlt.classList.add('hidden');
      propHref.value = el.getAttribute('href') || el.getAttribute('src') || '';
      hasLink = true;
    }

    linkGroup.classList.toggle('hidden', !hasLink);
  }

  let linkPropTimeout: ReturnType<typeof setTimeout>;
  function pushLinkChange() {
    clearTimeout(linkPropTimeout);
    linkPropTimeout = setTimeout(() => {
      const html = canvasManager.getContent();
      projectPages[activePageName] = html;
      codeEditorManager.setCode(html);
      pushUndoState();
    }, 300);
  }

  propHref.addEventListener('input', () => {
    const el = canvasManager.getSelectedElement();
    if (!el) return;
    el.setAttribute('href', propHref.value);
    pushLinkChange();
  });

  propSrc.addEventListener('input', () => {
    const el = canvasManager.getSelectedElement();
    if (el) el.setAttribute('src', propSrc.value);
    pushLinkChange();
  });

  propAlt.addEventListener('input', () => {
    const el = canvasManager.getSelectedElement();
    if (el) el.setAttribute('alt', propAlt.value);
    pushLinkChange();
  });

  // ─────────────────────────────────────────────
  // 20. Style Presets
  // ─────────────────────────────────────────────
  const presetList = document.getElementById('preset-list') as HTMLElement;
  const presetNameInput = document.getElementById('preset-name-input') as HTMLInputElement;
  const btnSavePreset = document.getElementById('btn-save-preset') as HTMLElement;

  function refreshPresetList() {
    renderPresetList(presetList,
      (name) => {
        const el = canvasManager.getSelectedElement();
        if (!el) return;
        applyPreset(name, el);
        canvasManager.updateOverlayPosition();
        const html = canvasManager.getContent();
        projectPages[activePageName] = html;
        codeEditorManager.setCode(html);
        pushUndoState();
      },
      (name) => {
        deletePreset(name);
        refreshPresetList();
      }
    );
  }

  btnSavePreset.addEventListener('click', () => {
    const el = canvasManager.getSelectedElement();
    if (!el) { alert('선택된 요소가 없습니다.'); return; }
    const name = presetNameInput.value.trim();
    if (!name) { alert('프리셋 이름을 입력하세요.'); return; }
    savePreset(name, el);
    presetNameInput.value = '';
    refreshPresetList();
  });

  // ─────────────────────────────────────────────
  // 21. Component Library
  // ─────────────────────────────────────────────
  const compLibList = document.getElementById('component-library-list') as HTMLElement;
  const compLibCount = document.getElementById('comp-lib-count') as HTMLElement;
  const btnSaveComponent = document.getElementById('btn-save-component') as HTMLElement;

  function refreshComponentLibrary() {
    renderComponentLibrary(compLibList, (html) => {
      const current = canvasManager.getContent();
      const injected = current.replace('</body>', `\n${html}\n</body>`);
      canvasManager.setContent(injected);
      projectPages[activePageName] = injected;
      codeEditorManager.setCode(injected);
      pushUndoState();
    });
    const comps = loadComponents();
    compLibCount.textContent = String(comps.length);
  }

  btnSaveComponent.addEventListener('click', () => {
    const el = canvasManager.getSelectedElement();
    if (!el) { alert('선택된 요소가 없습니다.'); return; }
    const name = prompt('컴포넌트 이름을 입력하세요:');
    if (!name) return;
    saveComponent(name, el.outerHTML);
    refreshComponentLibrary();
  });

  // ─────────────────────────────────────────────
  // 22. Ruler Guide Lines
  // ─────────────────────────────────────────────
  const canvasWrapperEl = document.getElementById('canvas-wrapper') as HTMLElement;
  initRulerGuides(canvasWrapperEl);

  // ─────────────────────────────────────────────
  // 23. Project Save / Load (HTML-only format)
  // ─────────────────────────────────────────────
  function serializeProject(): string {
    const current = canvasManager.getContent();
    // Embed all pages in a script tag within the HTML
    const pagesData = Object.entries(projectPages).map(([name, html]) => {
      return `<!-- wingstar-page: ${name} -->\n${html}\n<!-- endwingstar-page -->`;
    }).join('\n');
    // Strip the DOCTYPE from current content, use as main body
    const mainHtml = current.replace('<!DOCTYPE html>\n', '');
    return `<!DOCTYPE html>\n<!-- wingstar-project -->\n${pagesData}\n<!-- endwingstar-project -->\n${mainHtml}`;
  }

  function deserializeProject(fullHtml: string) {
    const pages: { [name: string]: string } = {};
    let mainContent = fullHtml;

    // Extract embedded pages from HTML comments
    const pageRegex = /<!-- wingstar-page:\s*([^\s-]+)\s*-->([\s\S]*?)<!--\s*endwingstar-page\s*-->/g;
    let match;
    let firstPageName: string | null = null;
    while ((match = pageRegex.exec(fullHtml)) !== null) {
      const name = match[1].trim();
      const html = match[2].trim();
      pages[name] = html;
      if (!firstPageName) firstPageName = name;
      // Remove from main content
      mainContent = mainContent.replace(match[0], '');
    }

    // Also strip project markers
    mainContent = mainContent.replace(/<!--\s*wingstar-project\s*-->/g, '').replace(/<!--\s*endwingstar-project\s*-->/g, '').trim();

    if (Object.keys(pages).length === 0) {
      // Not a WingStar project file; treat entire content as a single page
      pages['Page 1'] = mainContent;
    }

    return { pages, mainContent, firstPageName };
  }

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    const toast = document.getElementById('toast-message') as HTMLElement;
    if (!toast) return;
    toast.textContent = msg;
    toast.className = 'toast-message toast-visible';
    if (type === 'error') toast.classList.add('toast-error');
    clearTimeout((toast as any)._toastTimer);
    (toast as any)._toastTimer = setTimeout(() => toast.classList.remove('toast-visible'), 3000);
  }

  async function saveProject() {
    const serialized = serializeProject();
    const result = await window.electronAPI.saveHTML('index.html', serialized);
    if (result?.success) {
      showToast(`저장 완료: ${result.filePath}`, 'success');
    } else {
      showToast('저장 취소됨', 'error');
    }
  }

  async function openProject() {
    const result = await window.electronAPI.openFile();
    if (!result || !result.content) return;

    const { pages, firstPageName } = deserializeProject(result.content);
    projectPages = {};
    activePageName = '';

    let first = true;
    for (const [name, html] of Object.entries(pages)) {
      projectPages[name] = html;
      if (first || name === firstPageName) {
        activePageName = name;
        canvasManager.setContent(html);
        codeEditorManager.setCode(html);
        first = false;
      }
    }

    if (activePageName) renderPagesList();
    pushUndoState();
    showToast(`열기 완료: ${Object.keys(pages).length}개 페이지`, 'success');
  }

  document.getElementById('btn-save')?.addEventListener('click', saveProject);
  document.getElementById('btn-open')?.addEventListener('click', openProject);

  // ─────────────────────────────────────────────
  // 20. Shortcuts Help Modal
  // ─────────────────────────────────────────────
  const shortcutsModal = document.getElementById('shortcuts-modal') as HTMLElement;
  document.getElementById('btn-shortcuts')?.addEventListener('click', () => {
    shortcutsModal.classList.remove('hidden');
  });
  document.getElementById('btn-close-shortcuts')?.addEventListener('click', () => {
    shortcutsModal.classList.add('hidden');
  });
  shortcutsModal.addEventListener('click', (e) => {
    if (e.target === shortcutsModal) shortcutsModal.classList.add('hidden');
  });

  // ─────────────────────────────────────────────
  // 21. Keyboard Shortcuts
  // ─────────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    const ctrl = e.ctrlKey || e.metaKey;
    const active = document.activeElement;
    const isInputFocused = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT' || active.isContentEditable);

    if (ctrl && e.key === 's' && !isInputFocused) {
      e.preventDefault();
      saveProject();
    }
    if (ctrl && e.key === 'o' && !isInputFocused) {
      e.preventDefault();
      openProject();
    }
    if (ctrl && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undoManager.undo();
    }
    if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      undoManager.redo();
    }
    if (ctrl && e.key === 'c' && !isInputFocused) {
      e.preventDefault();
      const sel = canvasManager.getSelectedElement();
      if (sel) {
        clipboardHTML = sel.outerHTML;
      }
    }
    if (ctrl && e.key === 'g' && !e.shiftKey && !isInputFocused) {
      e.preventDefault();
      // Group: wrap selected element in a container div
      const sel = canvasManager.getSelectedElement();
      if (!sel || !sel.parentNode) return;
      const iframe = document.getElementById('editor-frame') as HTMLIFrameElement;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;
      const group = doc.createElement('div');
      group.className = 'wingstar-group';
      group.style.cssText = 'position:relative;border:1px dashed rgba(139,92,246,0.3);padding:4px;';
      sel.parentNode.insertBefore(group, sel);
      group.appendChild(sel);
      canvasManager.selectElement(group);
      const html = canvasManager.getContent();
      projectPages[activePageName] = html;
      codeEditorManager.setCode(html);
      pushUndoState();
    }
    if (ctrl && e.key === 'g' && e.shiftKey && !isInputFocused) {
      e.preventDefault();
      // Ungroup: extract children of group
      const sel = canvasManager.getSelectedElement();
      if (!sel || sel.className !== 'wingstar-group' || !sel.parentNode) return;
      const parent = sel.parentNode;
      const children = Array.from(sel.children);
      children.forEach(child => parent.insertBefore(child, sel));
      sel.remove();
      if (children.length > 0) {
        canvasManager.selectElement(children[0] as HTMLElement);
      } else {
        canvasManager.selectElement(null);
      }
      const html = canvasManager.getContent();
      projectPages[activePageName] = html;
      codeEditorManager.setCode(html);
      pushUndoState();
    }
    if (ctrl && e.key === 'a' && !isInputFocused) {
      e.preventDefault();
      const iframe = document.getElementById('editor-frame') as HTMLIFrameElement;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc || !doc.body) return;
      // Select the last meaningful child of body
      const children = Array.from(doc.body.children).filter((c: Element) => {
        const tag = c.tagName.toLowerCase();
        return tag !== 'style' && tag !== 'script';
      }) as HTMLElement[];
      if (children.length > 0) {
        const last = children[children.length - 1];
        // Multi-select all children visually via layer panel
        multiSelectedElements = children;
        canvasManager.selectElement(last);
      }
    }
    if (ctrl && e.key === 'v' && !isInputFocused) {
      e.preventDefault();
      if (!clipboardHTML) return;
      const iframe = document.getElementById('editor-frame') as HTMLIFrameElement;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;
      const temp = doc.createElement('div');
      temp.innerHTML = clipboardHTML;
      const clone = temp.firstElementChild as HTMLElement;
      if (!clone) return;
      doc.body.appendChild(clone);
      canvasManager.selectElement(clone);
      const html = canvasManager.getContent();
      projectPages[activePageName] = html;
      codeEditorManager.setCode(html);
      pushUndoState();
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && !ctrl && !isInputFocused) {
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
