import { UndoManager } from './undo-manager';

export function initHistoryPanel(undoManager: UndoManager) {
  const list = document.getElementById('history-list') as HTMLElement;
  const count = document.getElementById('history-count') as HTMLElement;
  if (!list) return;

  const render = () => {
    const size = undoManager.getSize();
    const index = undoManager.getCurrentIndex();
    if (count) count.textContent = `${index + 1}/${size}`;

    if (size === 0) {
      list.innerHTML = '<div class="history-empty">기록 없음</div>';
      return;
    }

    list.innerHTML = '';
    for (let i = 0; i < size; i++) {
      const item = document.createElement('div');
      item.className = `history-item${i === index ? ' active' : ''}${i > index ? ' future' : ''}`;
      item.textContent = `상태 ${i + 1}`;
      item.addEventListener('click', () => {
        if (i < index) {
          const steps = index - i;
          for (let s = 0; s < steps; s++) undoManager.undo();
        } else if (i > index) {
          const steps = i - index;
          for (let s = 0; s < steps; s++) undoManager.redo();
        }
      });
      list.appendChild(item);
    }
    list.scrollTop = list.scrollHeight;
  };

  const origPush = undoManager.pushState.bind(undoManager);
  undoManager.pushState = (html: string) => {
    origPush(html);
    render();
  };

  const origUndo = undoManager.undo.bind(undoManager);
  undoManager.undo = () => {
    const result = origUndo();
    render();
    return result;
  };

  const origRedo = undoManager.redo.bind(undoManager);
  undoManager.redo = () => {
    const result = origRedo();
    render();
    return result;
  };

  render();
}
