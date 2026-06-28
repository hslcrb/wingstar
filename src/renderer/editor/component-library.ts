const STORAGE_KEY = 'wingstar-component-library';

interface SavedComponent {
  name: string;
  html: string;
}

export function loadComponents(): SavedComponent[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

function saveComponents(list: SavedComponent[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function saveComponent(name: string, html: string): SavedComponent {
  const list = loadComponents();
  const existing = list.findIndex(c => c.name === name);
  const comp: SavedComponent = { name, html };
  if (existing >= 0) list[existing] = comp;
  else list.push(comp);
  saveComponents(list);
  return comp;
}

export function deleteComponent(name: string) {
  saveComponents(loadComponents().filter(c => c.name !== name));
}

export function renderComponentLibrary(
  container: HTMLElement,
  onInsert: (html: string) => void
) {
  const comps = loadComponents();
  if (comps.length === 0) {
    container.innerHTML = '<div class="comp-lib-empty">저장된 컴포넌트가 없습니다.<br>요소를 선택하고 "컴포넌트 저장" 버튼을 사용하세요.</div>';
    return;
  }

  container.innerHTML = comps.map(c => `
    <div class="comp-lib-item" draggable="true" data-comp-name="${c.name}">
      <span>${c.name}</span>
      <button class="comp-lib-del" data-comp-del="${c.name}">&times;</button>
    </div>
  `).join('');

  container.querySelectorAll('.comp-lib-item').forEach(el => {
    const html = comps.find(c => c.name === (el as HTMLElement).getAttribute('data-comp-name'))?.html || '';

    el.addEventListener('dragstart', (e: any) => {
      e.dataTransfer.setData('text/plain', 'component-library');
      e.dataTransfer.setData('text/html', html);
    });

    el.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.comp-lib-del')) return;
      onInsert(html);
    });
  });

  container.querySelectorAll('.comp-lib-del').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const name = (btn as HTMLElement).getAttribute('data-comp-del');
      if (name) {
        deleteComponent(name);
        renderComponentLibrary(container, onInsert);
      }
    });
  });
}
