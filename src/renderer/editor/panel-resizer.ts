import { CanvasManager } from './canvas';

export function initPanelResizers(canvasManager: CanvasManager) {
  const mainContainer = document.querySelector('.main-container') as HTMLElement;
  const resizerLeft = document.getElementById('resizer-left') as HTMLElement;
  const resizerCenter = document.getElementById('resizer-center') as HTMLElement;
  const resizerRight = document.getElementById('resizer-right') as HTMLElement;

  const leftSidebar = document.querySelector('.left-sidebar') as HTMLElement;
  const codeEditorPanel = document.getElementById('code-editor-panel') as HTMLElement;
  const rightSidebar = document.querySelector('.right-sidebar') as HTMLElement;

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

  if (resizerRight && rightSidebar) {
    setupDrag(
      resizerRight,
      (dx, startWidth) => {
        let newWidth = startWidth - dx;
        if (newWidth < MIN_RIGHT) newWidth = MIN_RIGHT;
        if (newWidth > MAX_RIGHT) newWidth = MAX_RIGHT;
        rightSidebar.style.width = `${newWidth}px`;
      },
      () => rightSidebar.getBoundingClientRect().width
    );
  }
}